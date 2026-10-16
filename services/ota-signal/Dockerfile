# syntax=docker/dockerfile:1

FROM golang:1.27.0-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go test ./... \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/tempo-ota-signal .

FROM scratch
LABEL org.opencontainers.image.title="Tempo OTA Signal" \
      org.opencontainers.image.source="https://github.com/FelixZoe/TEMPO"
COPY --from=build /out/tempo-ota-signal /tempo-ota-signal
ENV OTA_SIGNAL_ADDR=:8787
EXPOSE 8787
USER 65532:65532
ENTRYPOINT ["/tempo-ota-signal"]
