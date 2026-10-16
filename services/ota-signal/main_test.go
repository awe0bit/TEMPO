package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestPublishBroadcastsToWebSocketClients(t *testing.T) {
	api, err := newAPI("test-token")
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(api.handler())
	defer server.Close()

	websocketURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/v1/events"
	connection, _, err := websocket.DefaultDialer.Dial(websocketURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	deadline := time.Now().Add(time.Second)
	for api.hub.count() != 1 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if api.hub.count() != 1 {
		t.Fatal("websocket client was not registered")
	}

	body := []byte(`{"channel":"production","runtimeVersion":"0.6.7","commit":"abc123"}`)
	request, err := http.NewRequest(http.MethodPost, server.URL+"/v1/publish", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer test-token")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", response.StatusCode)
	}

	_ = connection.SetReadDeadline(time.Now().Add(2 * time.Second))
	var event announcement
	if err := connection.ReadJSON(&event); err != nil {
		t.Fatal(err)
	}
	if event.Type != "ota-ready" || event.Channel != "production" || event.RuntimeVersion != "0.6.7" {
		t.Fatalf("unexpected event: %#v", event)
	}
}

func TestPublishRequiresToken(t *testing.T) {
	api, err := newAPI("test-token")
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/publish", bytes.NewReader([]byte(`{}`)))
	response := httptest.NewRecorder()
	api.handler().ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", response.Code)
	}
}

func TestHealthReportsClients(t *testing.T) {
	api, err := newAPI("test-token")
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()
	api.handler().ServeHTTP(response, request)

	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["ok"] != true {
		t.Fatalf("unexpected health response: %s", response.Body.String())
	}
}
