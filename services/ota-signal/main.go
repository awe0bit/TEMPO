package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

const (
	defaultAddress = ":8787"
	maxBodyBytes  = 16 << 10
)

type announcement struct {
	Type           string    `json:"type"`
	Channel        string    `json:"channel"`
	RuntimeVersion string    `json:"runtimeVersion"`
	UpdateID       string    `json:"updateId,omitempty"`
	Commit         string    `json:"commit,omitempty"`
	PublishedAt    time.Time `json:"publishedAt"`
}

type hub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func newHub() *hub {
	return &hub{clients: make(map[chan []byte]struct{})}
}

func (h *hub) subscribe() chan []byte {
	client := make(chan []byte, 1)
	h.mu.Lock()
	h.clients[client] = struct{}{}
	h.mu.Unlock()
	return client
}

func (h *hub) unsubscribe(client chan []byte) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client)
	}
	h.mu.Unlock()
}

func (h *hub) broadcast(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		select {
		case client <- message:
		default:
		}
	}
}

func (h *hub) count() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

type api struct {
	token    string
	hub      *hub
	upgrader websocket.Upgrader
}

func newAPI(token string) (*api, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("OTA_SIGNAL_TOKEN must be set")
	}
	return &api{
		token: token,
		hub:   newHub(),
		upgrader: websocket.Upgrader{
			HandshakeTimeout: 5 * time.Second,
			CheckOrigin: func(*http.Request) bool {
				return true
			},
		},
	}, nil
}

func (a *api) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", a.health)
	mux.HandleFunc("GET /v1/events", a.events)
	mux.HandleFunc("POST /v1/publish", a.publish)
	return securityHeaders(mux)
}

func (a *api) health(response http.ResponseWriter, _ *http.Request) {
	response.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(response).Encode(map[string]any{"ok": true, "clients": a.hub.count()})
}

func (a *api) events(response http.ResponseWriter, request *http.Request) {
	connection, err := a.upgrader.Upgrade(response, request, nil)
	if err != nil {
		return
	}
	defer connection.Close()

	client := a.hub.subscribe()
	defer a.hub.unsubscribe(client)

	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case message, ok := <-client:
			if !ok {
				return
			}
			_ = connection.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := connection.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = connection.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (a *api) publish(response http.ResponseWriter, request *http.Request) {
	if !a.authorized(request) {
		http.Error(response, "unauthorized", http.StatusUnauthorized)
		return
	}
	request.Body = http.MaxBytesReader(response, request.Body, maxBodyBytes)
	defer request.Body.Close()

	var event announcement
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&event); err != nil {
		http.Error(response, "invalid announcement", http.StatusBadRequest)
		return
	}
	event.Type = "ota-ready"
	event.Channel = strings.TrimSpace(event.Channel)
	event.RuntimeVersion = strings.TrimSpace(event.RuntimeVersion)
	if event.Channel == "" || event.RuntimeVersion == "" {
		http.Error(response, "channel and runtimeVersion are required", http.StatusBadRequest)
		return
	}
	if event.PublishedAt.IsZero() {
		event.PublishedAt = time.Now().UTC()
	}
	message, err := json.Marshal(event)
	if err != nil {
		http.Error(response, "encode announcement", http.StatusInternalServerError)
		return
	}
	a.hub.broadcast(message)
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(response).Encode(map[string]any{"accepted": true, "clients": a.hub.count()})
}

func (a *api) authorized(request *http.Request) bool {
	provided := strings.TrimSpace(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer "))
	if provided == "" || len(provided) != len(a.token) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(provided), []byte(a.token)) == 1
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		response.Header().Set("Cache-Control", "no-store")
		response.Header().Set("X-Content-Type-Options", "nosniff")
		next.ServeHTTP(response, request)
	})
}

func main() {
	if len(os.Args) == 2 && os.Args[1] == "healthcheck" {
		if err := healthcheck(); err != nil {
			log.Print(err)
			os.Exit(1)
		}
		return
	}
	api, err := newAPI(os.Getenv("OTA_SIGNAL_TOKEN"))
	if err != nil {
		log.Fatal(err)
	}
	address := strings.TrimSpace(os.Getenv("OTA_SIGNAL_ADDR"))
	if address == "" {
		address = defaultAddress
	}
	server := &http.Server{
		Addr:              address,
		Handler:           api.handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		IdleTimeout:       70 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}

	errorsChannel := make(chan error, 1)
	go func() {
		log.Printf("Tempo OTA signal listening on %s", address)
		errorsChannel <- server.ListenAndServe()
	}()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	select {
	case signalValue := <-signals:
		log.Printf("received %s; shutting down", signalValue)
	case err := <-errorsChannel:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(fmt.Errorf("serve: %w", err))
		}
		return
	}
	context, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(context); err != nil {
		log.Printf("graceful shutdown: %v", err)
	}
}

func healthcheck() error {
	client := &http.Client{Timeout: 2 * time.Second}
	response, err := client.Get("http://127.0.0.1:8787/health")
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("health endpoint returned %s", response.Status)
	}
	return nil
}
