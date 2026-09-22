# api-server
api-server - это основное Backend API для продукта Alpa Developer Platform

## Tech Stack
1. Language: `Go v1.27`
2. Database and library: `PostgreSQL` + `github.com/jackc/pgx/v5` + `github.com/sqlc-dev/sqlc`
3. Main web-framework: `github.com/gin-gonic/gin`
4. Test strategy: E2E-тесты в папке ./tests/e2e с использованием `github.com/ozontech/testo` и плагина к нему `github.com/ozontech/testo-allure`. Это единая точка правды которая проверяет конкретные сценарии работы api-server. Пиши unit-тесты только для самопроверки - по окончанию работ они должны быть удалены. Каждый e2e-test содержит в себе следующие поля:
  - t.Epic("проверяемый_домен")
  - t.Feature("проверяемый_агрегат")
  - t.Story("операция_над_агрегатом")
  - t.Severity("важность_теста")
  - t.Tags("e2e", "positive_or_negative_scenario (positive/negative")
  - t.Title("конкретное описание сценария с полным описанием того что проверяется")
  Для запуска тестов используй команду `task e2e-test`

Мультисценарии описываются через allure.Step() (например, если нам для создания Product сначала надо создать Workspace, то создание Workspace будет как первый step)

## Documentation

OpenAPI-документация лежит в `docs/openapi.json` и `openapi.yaml` - при изменении API-  контракта ее обязательно нужно обновлять. OpenAPI должна быть максимально подробной с различными примерами выполнения

## Code Architecture
1. Направление зависимостей описывается правилами `depguard` в `.golangci.yml` и не должно нарушаться. Проверяй это командой `check-lint`
2. Агрегаты домена `inventory` находятся в пакете в `internal/domain/inventory`
3. Application-слой отвечает за вызов service-слоя а так-же недоменную логику: логирование, сбор и отправка метрик, трейсинг. Так-же Application-слой это фасад для HTTP-уровня который находится в `internal/httpapi`.
4. service-слой который является частью application - это структура которая выполняет строго взаимодействие с репозиториями, а так-же управляет транзакционной границей и созданием доменных типов через конструкторы. Основная задача service - взаимодействие с repository и создание/чтение доменных агрегатов через интерфейсы
5. Все HTTP Routes объявляются в `internal/httpapi/routing.go`
6. Конфигурация описана в `config.yaml`, конфигурация для сборки в образ `config.docker.yaml`, пример конфигурации `config.example.yaml`
7. Все SQL-запросы строго должны быть сгенерированы через `sqlc`
8. Каждый слой выполняет свою часть валидации: `HTTP handlers` выполняют транспортную валидацию с помощью validate-тегов на структурах которые описывают входящий запрос(проверка длинны полей, проверка required-полей, проверка размера). Domain-слой/Service-слой выполняет проверку доменных правил
