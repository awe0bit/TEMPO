# Tempo 服务器编排

该编排把 Tempo 的两个常驻服务放在同一个 1Panel Compose 项目中：

- `sync`：任务、番茄钟和 RSS 阅读状态同步，监听 `127.0.0.1:8080`。
- `ota-signal`：iOS 前台 OTA 发布信号，监听 `127.0.0.1:8787`。

生产服务器由 `.github/workflows/ota-signal.yml` 自动部署到：

```text
/opt/1panel/docker/compose/tempo-services
```

`sync.env`、`ota.env` 和 `/opt/qingxu/sync/data` 不进入 Git。工作流首次迁移时会从正在运行的旧同步容器保留配置和数据，然后把两个服务注册为 1Panel 中的单一 `tempo-services` 编排。

日常管理只需在 1Panel 的“容器 → 编排”中操作 `tempo-services`。不要删除 `sync.env`、`ota.env` 或 `/opt/qingxu/sync/data`。
