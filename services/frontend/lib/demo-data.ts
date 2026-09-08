import type { AtlasState, CoverageEvaluation, LocalizedText, SourceInfo } from './domain';

const text = (ru: string, en: string): LocalizedText => ({ ru, en });
const manual: SourceInfo = { source: 'Manual', confidence: 100, state: 'Confirmed' };
const github: SourceInfo = { source: 'GitHub', confidence: 94, state: 'Confirmed' };
const discovered: SourceInfo = { source: 'IaC', confidence: 82, state: 'Suggested' };
const scanner: SourceInfo = { source: 'Scanner', confidence: 96, state: 'Confirmed' };

const componentControls = ['SAST', 'SCA', 'Secrets', 'IaC'] as const;
const componentStatusMatrix = [
  ['checkout-web', 'checkout', ['Healthy', 'Healthy', 'Healthy', 'Not applicable']],
  ['orders-api', 'checkout', ['Healthy', 'Healthy', 'Gap', 'Healthy']],
  ['payment-worker', 'checkout', ['Healthy', 'Healthy', 'Gap', 'Healthy']],
  ['auth-sdk', 'checkout', ['Healthy', 'Healthy', 'Healthy', 'Not applicable']],
  ['orders-db', 'checkout', ['Not applicable', 'Not applicable', 'Not applicable', 'Healthy']],
  ['payment-queue', 'checkout', ['Not applicable', 'Not applicable', 'Not applicable', 'Healthy']],
  ['checkout-runtime-config', 'checkout', ['Not applicable', 'Not applicable', 'Not applicable', 'Gap']],
  ['identity-api', 'identity', ['Healthy', 'Healthy', 'Healthy', 'Healthy']],
  ['merchant-web', 'merchant', ['Healthy', 'Stale', 'Healthy', 'Not applicable']],
  ['deploy-controller', 'developer', ['Healthy', 'Healthy', 'Healthy', 'Healthy']],
  ['artifact-store', 'developer', ['Not applicable', 'Not applicable', 'Not applicable', 'Healthy']],
] as const;

const infrastructureComponentIds = new Set(['orders-db', 'payment-queue', 'checkout-runtime-config', 'artifact-store']);

const coverage: CoverageEvaluation[] = componentStatusMatrix.flatMap(([componentId, productId, statuses]) =>
  componentControls.map((control, index) => {
    const status = statuses[index];
    return {
      id: `${componentId}-${control.toLowerCase()}`,
      productId,
      componentId,
      control,
      status,
      tool: control === 'SCA' ? 'Trivy' : control === 'Secrets' ? 'Gitleaks' : control === 'IaC' ? 'Semgrep IaC' : 'Semgrep',
      lastRun: status === 'Gap' || status === 'Not applicable' ? undefined : status === 'Stale' ? '2026-08-11T09:00:00Z' : '2026-08-24T08:32:00Z',
      branch: infrastructureComponentIds.has(componentId) ? undefined : 'main',
      evidence: status === 'Gap'
        ? 'No successful scan for the default branch'
        : status === 'Not applicable'
          ? `${control} is not applicable to this component type`
          : infrastructureComponentIds.has(componentId)
            ? 'Successful application infrastructure configuration check'
            : 'Successful scan for revision 7e91d4a',
    };
  }),
);

export const demoState: AtlasState = {
  teams: [
    { ...manual, id: 'commerce-team', name: 'Digital Commerce and Order Fulfillment Engineering', lead: 'Priya Shah', leadEmail: 'priya.shah@acme.com', securityChampion: 'Leo Martin', members: 14 },
    { ...manual, id: 'payments-team', name: 'Payment Processing and Financial Reconciliation', lead: 'Maya Chen', leadEmail: 'maya.chen@acme.com', securityChampion: 'Daniel Kim', members: 9 },
    { ...manual, id: 'identity-team', name: 'Customer Identity and Access Management Engineering', lead: 'Noah Williams', leadEmail: 'noah.williams@acme.com', securityChampion: 'Sara Lind', members: 11 },
    { ...manual, id: 'platform-team', name: 'Developer Experience and Runtime Platform Engineering', lead: 'Alex Morgan', leadEmail: 'alex.morgan@acme.com', securityChampion: 'Iris Wang', members: 18 },
  ],
  infrastructureCatalog: [
    {
      ...manual,
      id: 'infra-cassandra',
      name: 'Cassandra',
      componentKind: 'Infrastructure Component',
      category: 'Database',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/apachecassandra',
      description: text('Распределённая wide-column база данных для больших объёмов и высокой доступности.', 'A distributed wide-column database for high-volume, highly available workloads.'),
    },
    {
      ...manual,
      id: 'infra-kafka',
      name: 'Kafka',
      componentKind: 'Infrastructure Component',
      category: 'Queue/Stream',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/apachekafka',
      description: text('Платформа потоковых событий для асинхронного обмена сообщениями между сервисами.', 'An event-streaming platform for asynchronous communication between services.'),
    },
    {
      ...manual,
      id: 'infra-postgresql',
      name: 'PostgreSQL',
      componentKind: 'Infrastructure Component',
      category: 'Database',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/postgresql',
      description: text('Реляционная база данных для транзакционных данных и сложных запросов.', 'A relational database for transactional data and complex queries.'),
    },
    {
      ...manual,
      id: 'infra-rabbitmq',
      name: 'RabbitMQ',
      componentKind: 'Infrastructure Component',
      category: 'Queue/Stream',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/rabbitmq',
      description: text('Брокер сообщений для очередей, маршрутизации и надёжной доставки событий.', 'A message broker for queues, routing, and reliable event delivery.'),
    },
    {
      ...manual,
      id: 'infra-minio',
      name: 'MinIO S3',
      componentKind: 'Infrastructure Component',
      category: 'Object Storage',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/minio',
      description: text('S3-совместимое объектное хранилище для файлов, артефактов и резервных копий.', 'S3-compatible object storage for files, artifacts, and backups.'),
    },
    {
      ...manual,
      id: 'infra-mongodb',
      name: 'MongoDB',
      componentKind: 'Infrastructure Component',
      category: 'Database',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/mongodb',
      description: text('Документная база данных для гибких JSON-подобных моделей данных.', 'A document database for flexible JSON-like data models.'),
    },
    {
      ...manual,
      id: 'infra-sqlite',
      name: 'SQLite',
      componentKind: 'Infrastructure Component',
      category: 'Database',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/sqlite',
      description: text('Встраиваемая файловая SQL-база для локальных и компактных приложений.', 'An embedded file-based SQL database for local and compact applications.'),
    },
    {
      ...manual,
      id: 'infra-kubernetes',
      name: 'Kubernetes',
      componentKind: 'Infrastructure Component',
      category: 'Deployment Environment',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/kubernetes',
      description: text('Среда оркестрации контейнеров для развёртывания и эксплуатации прикладных нагрузок.', 'A container orchestration environment for deploying and operating application workloads.'),
    },
    {
      ...manual,
      id: 'infra-docker-compose',
      name: 'Docker Compose',
      componentKind: 'Infrastructure Component',
      category: 'Deployment Environment',
      custom: false,
      logoUrl: 'https://cdn.simpleicons.org/docker',
      description: text('Декларативная среда для запуска многоконтейнерных приложений на одном хосте.', 'A declarative environment for running multi-container applications on a single host.'),
    },
  ],
  repositories: [
    { ...github, id: 'commerce-services', name: 'digital-commerce-transaction-services-monorepo', provider: 'GitHub', url: 'github.com/acme/digital-commerce-transaction-services-monorepo', defaultBranch: 'main' },
    { ...github, id: 'checkout-web-repo', name: 'customer-checkout-and-merchant-experience-frontend', provider: 'GitHub', url: 'github.com/acme/customer-checkout-and-merchant-experience-frontend', defaultBranch: 'main' },
    { ...github, id: 'auth-sdk-repo', name: 'enterprise-customer-identity-and-access-services', provider: 'GitHub', url: 'github.com/acme/enterprise-customer-identity-and-access-services', defaultBranch: 'main' },
    { ...github, id: 'platform-iac', name: 'developer-runtime-platform-infrastructure-and-controllers', provider: 'GitHub', url: 'github.com/acme/developer-runtime-platform-infrastructure-and-controllers', defaultBranch: 'main' },
  ],
  products: [
    {
      ...manual, id: 'checkout', key: 'GCPAY', name: 'Global Checkout and Payment Orchestration Platform', criticality: 'Mission-Critical', lifecycle: 'Production', exposure: 'Internet', ownerTeamId: 'commerce-team', productOwnerName: 'Olivia Bennett', productOwnerEmail: 'olivia.bennett@acme.com',
      componentIds: ['checkout-web', 'orders-api', 'payment-worker', 'auth-sdk', 'orders-db', 'payment-queue', 'checkout-runtime-config'],
      description: text('Оформление заказов, платежная оркестрация и события жизненного цикла заказа.', 'Checkout, payment orchestration, and order lifecycle events.'),
    },
    {
      ...manual, id: 'identity', key: 'E-CIAM', name: 'Enterprise Customer Identity and Access Management Platform', criticality: 'Mission-Critical', lifecycle: 'Production', exposure: 'Internet', ownerTeamId: 'identity-team', productOwnerName: 'Ethan Cole', productOwnerEmail: 'ethan.cole@acme.com',
      componentIds: ['identity-api', 'auth-sdk'],
      description: text('Аутентификация, сессии и восстановление учётных записей.', 'Authentication, sessions, and account recovery.'),
    },
    {
      ...manual, id: 'merchant', key: 'MRC-OPS', name: 'International Merchant Operations and Settlement Portal', criticality: 'Business-Critical', lifecycle: 'Production', exposure: 'Internet', ownerTeamId: 'commerce-team', productOwnerName: 'Sofia Ramirez', productOwnerEmail: 'sofia.ramirez@acme.com',
      componentIds: ['merchant-web', 'auth-sdk'],
      description: text('Кабинет управления заказами и выплатами для мерчантов.', 'Order and payout management for merchants.'),
    },
    {
      ...manual, id: 'developer', key: 'IDP-CD', name: 'Internal Developer Experience and Continuous Delivery Platform', criticality: 'Office-Productivity', lifecycle: 'Production', exposure: 'Internal', ownerTeamId: 'platform-team', productOwnerName: 'Marcus Lee', productOwnerEmail: 'marcus.lee@acme.com',
      componentIds: ['deploy-controller', 'artifact-store'],
      description: text('Общие CI/CD, runtime-шаблоны и инструменты разработчиков.', 'Shared CI/CD, runtime templates, and developer tooling.'),
    },
  ],
  components: [
    {
      ...github, id: 'checkout-web', name: 'customer-checkout-experience-frontend', kind: 'Frontend Service', apiType: 'REST', ownerTeamId: 'commerce-team', productIds: ['checkout'], technologies: ['TypeScript', 'React'],
      description: text('Пользовательский интерфейс оформления заказа.', 'Customer-facing checkout interface.'),
      bindings: [{ ...github, repositoryId: 'checkout-web-repo', path: '/', branch: 'main', role: 'Source' }],
      deployments: [{ id: 'checkout-web-prod', environment: 'Production', version: '2026.08.24.1', revision: '7e91d4a' }],
    },
    {
      ...github, id: 'orders-api', name: 'order-lifecycle-orchestration-and-fulfillment-api', kind: 'Backend Service', apiType: 'REST', ownerTeamId: 'commerce-team', productIds: ['checkout'], technologies: ['Go'],
      description: text('API заказов и оркестрация checkout-процесса.', 'Orders API and checkout orchestration.'),
      bindings: [{ ...github, repositoryId: 'commerce-services', path: '/orders-api', branch: 'main', role: 'Source' }],
      deployments: [{ id: 'orders-prod', environment: 'Production', version: '2.14.3', revision: '7e91d4a' }],
    },
    {
      ...github, id: 'payment-worker', name: 'payment-authorization-and-settlement-processing-worker', kind: 'Backend Service', apiType: 'Event-driven', ownerTeamId: 'payments-team', productIds: ['checkout'], technologies: ['Go'],
      description: text('Фоновая обработка платёжных событий.', 'Background processing of payment events.'),
      bindings: [{ ...github, repositoryId: 'commerce-services', path: '/payment-worker', branch: 'main', role: 'Source' }],
      deployments: [{ id: 'payment-prod', environment: 'Production', version: '4.8.1', revision: '9a2cf1e' }],
    },
    {
      ...github, id: 'auth-sdk', name: 'shared-customer-identity-authentication-and-authorization-service', kind: 'Backend Service', apiType: 'REST', ownerTeamId: 'identity-team', productIds: ['checkout', 'identity', 'merchant'], technologies: ['Java', 'OAuth 2.1'],
      description: text('Общий сервис аутентификации для нескольких продуктов.', 'Shared authentication service used by several products.'),
      bindings: [{ ...github, repositoryId: 'auth-sdk-repo', path: '/', branch: 'main', role: 'Source' }], deployments: [],
    },
    {
      ...github, id: 'identity-api', name: 'customer-identity-session-and-account-management-api', kind: 'Backend Service', apiType: 'REST', ownerTeamId: 'identity-team', productIds: ['identity'], technologies: ['Go'],
      description: text('Управление сессиями и учётными записями.', 'Session and account management API.'),
      bindings: [{ ...github, repositoryId: 'auth-sdk-repo', path: '/services/identity', branch: 'main', role: 'Source' }],
      deployments: [{ id: 'identity-prod', environment: 'Production', version: '5.3.2', revision: '4fb2a11' }],
    },
    {
      ...github, id: 'merchant-web', name: 'international-merchant-operations-portal-frontend', kind: 'Frontend Service', apiType: 'REST', ownerTeamId: 'commerce-team', productIds: ['merchant'], technologies: ['TypeScript', 'Next.js'],
      description: text('Веб-интерфейс кабинета мерчанта.', 'Merchant portal web interface.'),
      bindings: [{ ...github, repositoryId: 'checkout-web-repo', path: '/apps/merchant', branch: 'main', role: 'Source' }], deployments: [],
    },
    {
      ...github, id: 'deploy-controller', name: 'application-deployment-orchestration-controller', kind: 'Backend Service', apiType: 'gRPC', ownerTeamId: 'platform-team', productIds: ['developer'], technologies: ['Go', 'Kubernetes'],
      description: text('Внутренний контроллер развёртывания приложений.', 'Internal application deployment controller.'),
      bindings: [{ ...github, repositoryId: 'platform-iac', path: '/controllers/deploy', branch: 'main', role: 'Source' }], deployments: [],
    },
    {
      ...discovered, id: 'orders-db', name: 'Production Order Transaction PostgreSQL Cluster', kind: 'Infrastructure Component', apiType: 'Not applicable', ownerTeamId: 'commerce-team', productIds: ['checkout'], technologies: ['PostgreSQL 17'],
      description: text('Основное транзакционное хранилище заказов.', 'Primary transactional store for orders.'),
      infrastructureTemplateId: 'infra-postgresql', bindings: [], deployments: [{ id: 'orders-db-prod', environment: 'Production', version: '17.3', revision: 'iac-2218', url: 'https://db.acme.internal/environments/production/orders' }],
    },
    {
      ...discovered, id: 'payment-queue', name: 'payment.authorization.requested.production.events', kind: 'Infrastructure Component', apiType: 'Not applicable', ownerTeamId: 'payments-team', productIds: ['checkout'], technologies: ['Kafka'],
      description: text('Топик для асинхронной передачи запросов на оплату.', 'Topic for asynchronous payment requests.'),
      infrastructureTemplateId: 'infra-kafka', bindings: [], deployments: [{ id: 'payment-queue-prod', environment: 'Production', version: '3.8', revision: 'iac-2187', url: 'https://kafka.acme.internal/environments/production/topics/payment.requested' }],
    },
    {
      ...manual, id: 'checkout-runtime-config', name: 'Global Checkout Runtime Feature Configuration Service', kind: 'Infrastructure Component', apiType: 'Not applicable', ownerTeamId: 'commerce-team', productIds: ['checkout'], technologies: ['Custom runtime configuration'],
      description: text('Прикладная runtime-конфигурация, заведённая без шаблона каталога.', 'Application runtime configuration registered without a catalog template.'),
      bindings: [], deployments: [{ id: 'checkout-runtime-config-prod', environment: 'Production', version: 'Not specified', revision: 'manual', url: 'https://platform.acme.internal/environments/production/checkout/runtime-config' }],
    },
    {
      ...discovered, id: 'artifact-store', name: 'Centralized Production Build Artifact Object Storage', kind: 'Infrastructure Component', apiType: 'Not applicable', ownerTeamId: 'platform-team', productIds: ['developer'], technologies: ['MinIO S3'],
      description: text('Хранилище сборок и артефактов платформы разработки.', 'Storage for developer-platform builds and artifacts.'),
      infrastructureTemplateId: 'infra-minio', bindings: [], deployments: [{ id: 'artifact-store-prod', environment: 'Production', version: '2026.08', revision: 'iac-2054', url: 'https://minio.acme.internal/environments/production/artifacts' }],
    },
  ],
  resources: [
    { ...manual, id: 'payment-provider', name: 'External Multi-Region Payment Acquiring Provider', kind: 'External Service', ownerTeamId: 'payments-team', productIds: ['checkout'], environment: 'Production', technology: 'HTTPS API', dataClassification: 'Restricted' },
  ],
  topologyNodes: [
    { ...manual, id: 'customer', name: 'Customer', kind: 'Actor', productIds: ['checkout'] },
    { ...github, id: 'checkout-web', name: 'Customer Checkout Experience Frontend', kind: 'Component', productIds: ['checkout'], refId: 'checkout-web', ownerTeamId: 'commerce-team', environment: 'Production' },
    { ...github, id: 'orders-api', name: 'Order Lifecycle Orchestration and Fulfillment API', kind: 'Component', productIds: ['checkout'], refId: 'orders-api', ownerTeamId: 'commerce-team', environment: 'Production' },
    { ...discovered, id: 'orders-db', name: 'Production Order Transaction PostgreSQL Cluster', kind: 'Component', productIds: ['checkout'], refId: 'orders-db', ownerTeamId: 'commerce-team', environment: 'Production' },
    { ...discovered, id: 'payment-queue', name: 'Payment Authorization Requested Production Events', kind: 'Component', productIds: ['checkout'], refId: 'payment-queue', ownerTeamId: 'payments-team', environment: 'Production' },
    { ...manual, id: 'checkout-runtime-config', name: 'Global Checkout Runtime Feature Configuration Service', kind: 'Component', productIds: ['checkout'], refId: 'checkout-runtime-config', ownerTeamId: 'commerce-team', environment: 'Production' },
    { ...github, id: 'payment-worker', name: 'Payment Authorization and Settlement Processing Worker', kind: 'Component', productIds: ['checkout'], refId: 'payment-worker', ownerTeamId: 'payments-team', environment: 'Production' },
    { ...manual, id: 'payment-provider', name: 'External Multi-Region Payment Acquiring Provider', kind: 'External System', productIds: ['checkout'], refId: 'payment-provider', ownerTeamId: 'payments-team', environment: 'Production' },
    { ...github, id: 'auth-sdk', name: 'Shared Customer Identity Authentication and Authorization Service', kind: 'Component', productIds: ['checkout', 'identity', 'merchant'], refId: 'auth-sdk', ownerTeamId: 'identity-team' },
  ],
  topologyEdges: [
    { ...manual, id: 'customer-checkout', productId: 'checkout', sourceId: 'customer', targetId: 'checkout-web', type: 'CALLS_API', protocol: 'HTTPS', authenticated: false, encrypted: true, crossesTrustBoundary: true },
    { ...github, id: 'checkout-orders', productId: 'checkout', sourceId: 'checkout-web', targetId: 'orders-api', type: 'CALLS_API', protocol: 'HTTPS/REST', authenticated: true, encrypted: true },
    { ...discovered, id: 'orders-db-edge', productId: 'checkout', sourceId: 'orders-api', targetId: 'orders-db', type: 'WRITES_TO', protocol: 'PostgreSQL', authenticated: true, encrypted: true },
    { ...discovered, id: 'orders-queue', productId: 'checkout', sourceId: 'orders-api', targetId: 'payment-queue', type: 'PUBLISHES_TO', protocol: 'Kafka', authenticated: true, encrypted: true },
    { ...manual, id: 'orders-runtime-config', productId: 'checkout', sourceId: 'orders-api', targetId: 'checkout-runtime-config', type: 'USES', protocol: 'HTTPS', authenticated: true, encrypted: true },
    { ...discovered, id: 'queue-worker', productId: 'checkout', sourceId: 'payment-queue', targetId: 'payment-worker', type: 'CONSUMES_FROM', protocol: 'Kafka', authenticated: true, encrypted: true },
    { ...manual, id: 'worker-provider', productId: 'checkout', sourceId: 'payment-worker', targetId: 'payment-provider', type: 'CALLS_API', protocol: 'HTTPS', authenticated: true, encrypted: true, crossesTrustBoundary: true },
    { ...github, id: 'orders-auth', productId: 'checkout', sourceId: 'orders-api', targetId: 'auth-sdk', type: 'USES', authenticated: true },
  ],
  findings: [
    {
      ...scanner, id: 'SEC-1042', title: text('Раскрытый AWS access key', 'Exposed AWS access key'),
      description: text('Действующий ключ обнаружен в истории репозитория payment-worker.', 'An active key was detected in the payment-worker repository history.'),
      severity: 'Critical', category: 'Secrets', status: 'Needs triage', productIds: ['checkout'], componentId: 'payment-worker', ownerTeamId: 'payments-team', assignee: 'Maya Chen', contexts: ['Production', 'Secret', 'Fix available'], due: '2026-08-24',
      remediation: text('Отозвать ключ, выпустить новый credential и удалить значение из истории Git.', 'Revoke the key, issue a new credential, and remove the value from Git history.'),
      occurrences: [{ id: 'occ-1042', scanId: 'gitleaks-8821', source: 'Gitleaks', externalId: 'gitleaks:8821:42', fingerprint: 'secret:hmac:7f2c91', location: 'payment-worker/config/provider.go:42', revision: '9a2cf1e', firstSeen: '2026-08-24T07:30:00Z', lastSeen: '2026-08-24T08:32:00Z', maskedEvidence: 'AKIA••••••••7Q2P' }],
    },
    {
      ...scanner, id: 'SEC-1039', title: text('CVE-2026-31807 в Shared Auth Service', 'CVE-2026-31807 in Shared Auth Service'),
      description: text('Уязвимая версия auth middleware достижима в трёх продуктах.', 'A vulnerable auth middleware version is reachable in three products.'),
      severity: 'Critical', category: 'SCA', status: 'Confirmed', productIds: ['checkout', 'identity', 'merchant'], componentId: 'auth-sdk', ownerTeamId: 'identity-team', assignee: 'Noah Williams', contexts: ['Reachable', 'Shared component', 'KEV'], due: '2026-08-25',
      remediation: text('Обновить auth-core до 6.4.1 и пересобрать потребляющие приложения.', 'Upgrade auth-core to 6.4.1 and rebuild consuming applications.'),
      occurrences: [{ id: 'occ-1039', scanId: 'trivy-2218', source: 'Trivy', externalId: 'CVE-2026-31807', fingerprint: 'purl:auth-core@6.2.0:CVE-2026-31807', location: 'pom.xml · com.acme:auth-core:6.2.0', revision: '4fb2a11', firstSeen: '2026-08-22T11:00:00Z', lastSeen: '2026-08-24T08:32:00Z' }],
    },
    {
      ...scanner, id: 'SEC-1028', title: text('SQL-запрос собирается из пользовательского ввода', 'SQL query built from user input'),
      description: text('Параметр сортировки попадает в SQL без allowlist-проверки.', 'A sort parameter reaches SQL without an allowlist check.'),
      severity: 'High', category: 'SAST', status: 'In progress', productIds: ['checkout'], componentId: 'orders-api', ownerTeamId: 'commerce-team', assignee: 'Priya Shah', contexts: ['Internet-facing', 'Production', 'Fix available'], due: '2026-08-27',
      remediation: text('Использовать allowlist для полей сортировки и параметризованный запрос.', 'Use an allowlist for sortable fields and a parameterized query.'),
      occurrences: [{ id: 'occ-1028', scanId: 'semgrep-5513', source: 'Semgrep', externalId: 'go.sql.dynamic-query', fingerprint: 'sast:orders-api:query.go:118:sql', location: 'orders-api/internal/search/query.go:118', revision: '7e91d4a', firstSeen: '2026-08-21T14:10:00Z', lastSeen: '2026-08-24T08:32:00Z' }],
    },
    {
      ...scanner, id: 'SEC-1021', title: text('Избыточные IAM-права у Payment Worker', 'Overly broad IAM role for Payment Worker'),
      description: text('Роль разрешает запись во все buckets вместо одного прикладного ресурса.', 'The role allows writes to all buckets instead of one application resource.'),
      severity: 'High', category: 'IaC', status: 'Confirmed', productIds: ['checkout'], componentId: 'payment-worker', ownerTeamId: 'payments-team', assignee: 'Daniel Kim', contexts: ['Production', 'Least privilege'], due: '2026-08-29',
      remediation: text('Ограничить resource ARN нужным bucket и prefix.', 'Limit the resource ARN to the required bucket and prefix.'),
      occurrences: [{ id: 'occ-1021', scanId: 'semgrep-iac-617', source: 'Semgrep IaC', externalId: 'terraform.aws.iam.wildcard', fingerprint: 'iac:payment-worker:iam.tf:34:wildcard', location: 'terraform/payment-worker/iam.tf:34', revision: '2d91b7c', firstSeen: '2026-08-20T09:40:00Z', lastSeen: '2026-08-24T08:20:00Z' }],
    },
    {
      ...scanner, id: 'SEC-1008', title: text('Session cookie без SameSite', 'Session cookie missing SameSite'), description: text('Cookie сессии допускает cross-site отправку.', 'The session cookie allows cross-site transmission.'),
      severity: 'High', category: 'SAST', status: 'Confirmed', productIds: ['identity'], componentId: 'identity-api', ownerTeamId: 'identity-team', assignee: 'Sara Lind', contexts: ['Internet-facing'], due: '2026-08-30',
      remediation: text('Установить SameSite=Lax и Secure.', 'Set SameSite=Lax and Secure.'), occurrences: [],
    },
    {
      ...scanner, id: 'SEC-1002', title: text('Устаревший frontend dependency', 'Outdated frontend dependency'), description: text('Пакет имеет известную XSS-уязвимость.', 'The package has a known XSS vulnerability.'),
      severity: 'Medium', category: 'SCA', status: 'Resolved', productIds: ['merchant'], componentId: 'merchant-web', ownerTeamId: 'commerce-team', assignee: 'Leo Martin', contexts: ['Fix available'], due: '2026-09-06',
      remediation: text('Обновить пакет до исправленной версии.', 'Upgrade the package to the fixed version.'), occurrences: [],
    },
  ],
  scanReports: [
    { ...scanner, id: 'gitleaks-8821', componentId: 'payment-worker', control: 'Secrets', tool: 'Gitleaks', status: 'Completed with findings', startedAt: '2026-08-24T08:30:00Z', finishedAt: '2026-08-24T08:32:00Z', branch: 'main', revision: '9a2cf1e', findingIds: ['SEC-1042'] },
    { ...scanner, id: 'trivy-2218', componentId: 'auth-sdk', control: 'SCA', tool: 'Trivy', status: 'Completed with findings', startedAt: '2026-08-24T08:29:00Z', finishedAt: '2026-08-24T08:32:00Z', branch: 'main', revision: '4fb2a11', findingIds: ['SEC-1039'] },
    { ...scanner, id: 'semgrep-5513', componentId: 'orders-api', control: 'SAST', tool: 'Semgrep', status: 'Completed with findings', startedAt: '2026-08-24T08:27:00Z', finishedAt: '2026-08-24T08:32:00Z', branch: 'main', revision: '7e91d4a', findingIds: ['SEC-1028'] },
    { ...scanner, id: 'semgrep-iac-617', componentId: 'payment-worker', control: 'IaC', tool: 'Semgrep IaC', status: 'Completed with findings', startedAt: '2026-08-24T08:18:00Z', finishedAt: '2026-08-24T08:20:00Z', branch: 'main', revision: '2d91b7c', findingIds: ['SEC-1021'] },
    { ...scanner, id: 'semgrep-5498', componentId: 'identity-api', control: 'SAST', tool: 'Semgrep', status: 'Completed with findings', startedAt: '2026-08-24T08:21:00Z', finishedAt: '2026-08-24T08:24:00Z', branch: 'main', revision: '4fb2a11', findingIds: ['SEC-1008'] },
    { ...scanner, id: 'trivy-2176', componentId: 'merchant-web', control: 'SCA', tool: 'Trivy', status: 'Completed with findings', startedAt: '2026-08-11T08:58:00Z', finishedAt: '2026-08-11T09:00:00Z', branch: 'main', revision: 'b7c62da', findingIds: ['SEC-1002'] },
    { ...scanner, id: 'semgrep-5521', componentId: 'checkout-web', control: 'SAST', tool: 'Semgrep', status: 'Completed', startedAt: '2026-08-24T08:28:00Z', finishedAt: '2026-08-24T08:32:00Z', branch: 'main', revision: '7e91d4a', findingIds: [] },
    { ...scanner, id: 'iac-orders-db-2218', componentId: 'orders-db', control: 'IaC', tool: 'Semgrep IaC', status: 'Completed', startedAt: '2026-08-24T08:27:00Z', finishedAt: '2026-08-24T08:32:00Z', revision: 'iac-2218', findingIds: [] },
    { ...scanner, id: 'iac-payment-queue-2187', componentId: 'payment-queue', control: 'IaC', tool: 'Semgrep IaC', status: 'Completed', startedAt: '2026-08-24T08:26:00Z', finishedAt: '2026-08-24T08:31:00Z', revision: 'iac-2187', findingIds: [] },
    { ...scanner, id: 'iac-artifact-store-2054', componentId: 'artifact-store', control: 'IaC', tool: 'Semgrep IaC', status: 'Completed', startedAt: '2026-08-24T08:25:00Z', finishedAt: '2026-08-24T08:30:00Z', revision: 'iac-2054', findingIds: [] },
  ],
  threats: [
    {
      ...manual, id: 'THR-014', productId: 'checkout', targetType: 'Edge', targetId: 'orders-queue',
      title: text('Replay или подмена payment message', 'Replay or tampering of payment message'),
      scenario: text('Злоумышленник повторно публикует валидное событие и инициирует повторный платёж.', 'An attacker republishes a valid event and triggers a duplicate payment.'),
      stride: 'Tampering', likelihood: 2, impact: 3, ownerTeamId: 'payments-team',
      mitigation: text('Подписывать сообщения и проверять idempotency key.', 'Sign messages and enforce an idempotency key.'), status: 'Mitigating',
    },
    {
      ...manual, id: 'THR-011', productId: 'checkout', targetType: 'Node', targetId: 'orders-db',
      title: text('Несанкционированное чтение заказов', 'Unauthorized order data access'),
      scenario: text('Скомпрометированный workload читает данные заказов вне своего scope.', 'A compromised workload reads order data beyond its scope.'),
      stride: 'Information Disclosure', likelihood: 1, impact: 3, ownerTeamId: 'commerce-team',
      mitigation: text('Разделить роли чтения и включить audit logging.', 'Separate read roles and enable audit logging.'), status: 'Open',
    },
  ],
  threatModels: [
    { id: 'tm-checkout', productId: 'checkout', status: 'Needs review', updatedAt: '2026-08-11T09:00:00Z', approvedBy: 'Alex Morgan' },
    { id: 'tm-identity', productId: 'identity', status: 'Approved', updatedAt: '2026-08-22T12:00:00Z', approvedBy: 'Sara Lind' },
    { id: 'tm-merchant', productId: 'merchant', status: 'In review', updatedAt: '2026-08-17T15:00:00Z' },
    { id: 'tm-developer', productId: 'developer', status: 'Approved', updatedAt: '2026-08-20T10:00:00Z', approvedBy: 'Iris Wang' },
  ],
  coverage,
  profiles: [
    {
      id: 'tier-one', name: text('Mission-Critical системы', 'Mission-Critical systems'), criticalities: ['Mission-Critical'],
      requiredControls: ['SAST', 'SCA', 'Secrets', 'IaC', 'Threat Model'],
      freshnessDays: { SAST: 2, SCA: 2, Secrets: 1, IaC: 7, 'Threat Model': 30 },
      slaDays: { Critical: 2, High: 7, Medium: 30, Low: 90 },
    },
    {
      id: 'standard', name: text('Business и Office системы', 'Business and productivity systems'), criticalities: ['Business-Critical', 'Business-Operational', 'Office-Productivity'],
      requiredControls: ['SAST', 'SCA', 'Secrets'], freshnessDays: { SAST: 7, SCA: 7, Secrets: 7 },
      slaDays: { Critical: 3, High: 14, Medium: 45, Low: 120 },
    },
  ],
  exceptions: [],
  integrations: [
    { id: 'github', name: 'GitHub', kind: 'SCM', status: 'Connected', lastSync: '2026-08-24T08:31:00Z', description: text('Репозитории, команды и CODEOWNERS.', 'Repositories, teams, and CODEOWNERS.') },
    { id: 'gitlab', name: 'GitLab', kind: 'SCM', status: 'Not connected', description: text('SCM, pipeline metadata и security reports.', 'SCM, pipeline metadata, and security reports.') },
    { id: 'semgrep', name: 'Semgrep', kind: 'Scanner', status: 'Connected', lastSync: '2026-08-24T08:32:00Z', description: text('SAST и IaC findings.', 'SAST and IaC findings.') },
    { id: 'trivy', name: 'Trivy', kind: 'Scanner', status: 'Connected', lastSync: '2026-08-24T08:32:00Z', description: text('SCA и SBOM findings.', 'SCA and SBOM findings.') },
    { id: 'snyk', name: 'Snyk', kind: 'Scanner', status: 'Not connected', description: text('Необязательный источник результатов SAST/SCA/IaC.', 'Optional SAST/SCA/IaC findings source.') },
    { id: 'jira', name: 'Jira', kind: 'Issue tracker', status: 'Connected', lastSync: '2026-08-24T07:58:00Z', description: text('Remediation tasks и статусы.', 'Remediation tasks and statuses.') },
    { id: 'defectdojo', name: 'DefectDojo', kind: 'Import', status: 'Not connected', description: text('Необязательный импорт или миграция findings.', 'Optional findings import or migration.') },
  ],
};

export function cloneDemoState(): AtlasState {
  return JSON.parse(JSON.stringify(demoState)) as AtlasState;
}
