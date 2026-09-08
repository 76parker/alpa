export type Locale = 'ru' | 'en';
export type LocalizedText = { ru: string; en: string };

export type SourceName =
  | 'Manual'
  | 'GitHub'
  | 'GitLab'
  | 'CI/CD'
  | 'IaC'
  | 'Scanner'
  | 'Import';

export type SourceInfo = {
  source: SourceName;
  confidence: number;
  state: 'Suggested' | 'Confirmed';
};

export type Criticality = 'Mission-Critical' | 'Business-Critical' | 'Business-Operational' | 'Office-Productivity';
export type Lifecycle = 'Production' | 'Development' | 'Archived';
export type Environment = 'Development' | 'Stage' | 'Production';

export type Product = SourceInfo & {
  id: string;
  name: string;
  avatarUrl?: string;
  key: string;
  description: LocalizedText;
  criticality: Criticality;
  lifecycle: Lifecycle;
  exposure: 'Internet' | 'Internal';
  ownerTeamId: string;
  productOwnerName: string;
  productOwnerEmail: string;
  componentIds: string[];
};

export type ComponentKind = 'Backend Service' | 'Frontend Service' | 'Infrastructure Component';
export type ComponentApiType = 'REST' | 'gRPC' | 'GraphQL' | 'WebSocket' | 'Event-driven' | 'Not applicable';

export type InfrastructureCategory = 'Database' | 'Queue/Stream' | 'Object Storage' | 'Deployment Environment' | 'Cache' | 'Other';

export type InfrastructureCatalogItem = SourceInfo & {
  id: string;
  name: string;
  description: LocalizedText;
  componentKind: ComponentKind;
  category: InfrastructureCategory;
  custom: boolean;
  logoUrl?: string;
};

export type SourceBinding = SourceInfo & {
  repositoryId: string;
  path: string;
  branch: string;
  role: 'Source' | 'IaC' | 'Deployment config';
};

export type Deployment = {
  id: string;
  environment: Environment;
  version: string;
  revision: string;
  url?: string;
};

export type Component = SourceInfo & {
  id: string;
  name: string;
  description: LocalizedText;
  kind: ComponentKind;
  apiType: ComponentApiType;
  ownerTeamId: string;
  productIds: string[];
  technologies: string[];
  infrastructureTemplateId?: string;
  bindings: SourceBinding[];
  deployments: Deployment[];
};

export type Repository = SourceInfo & {
  id: string;
  name: string;
  provider: 'GitHub' | 'GitLab' | 'Bitbucket';
  url: string;
  defaultBranch: string;
};

export type ResourceKind = 'Database' | 'Queue' | 'Cache' | 'Object Store' | 'External Service' | 'Secret Store' | 'API';

export type ApplicationResource = SourceInfo & {
  id: string;
  name: string;
  kind: ResourceKind;
  ownerTeamId: string;
  productIds: string[];
  environment: Environment;
  technology: string;
  dataClassification?: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
};

export type TopologyNodeKind = 'Actor' | 'Component' | 'Resource' | 'External System';
export type TopologyEdgeType = 'CALLS_API' | 'READS_FROM' | 'WRITES_TO' | 'PUBLISHES_TO' | 'CONSUMES_FROM' | 'USES' | 'EXPOSES';

export type TopologyNode = SourceInfo & {
  id: string;
  name: string;
  kind: TopologyNodeKind;
  productIds: string[];
  refId?: string;
  ownerTeamId?: string;
  environment?: Environment;
};

export type TopologyEdge = SourceInfo & {
  id: string;
  productId: string;
  sourceId: string;
  targetId: string;
  type: TopologyEdgeType;
  protocol?: string;
  authenticated?: boolean;
  encrypted?: boolean;
  crossesTrustBoundary?: boolean;
};

export type Team = SourceInfo & {
  id: string;
  name: string;
  avatarUrl?: string;
  lead: string;
  leadEmail: string;
  securityChampion: string;
  members: number;
};

export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingCategory = 'SAST' | 'SCA' | 'IaC' | 'Secrets' | 'Manual';
export type FindingStatus = 'Needs triage' | 'Confirmed' | 'In progress' | 'Resolved' | 'False positive';

export type FindingOccurrence = {
  id: string;
  scanId: string;
  source: string;
  externalId?: string;
  fingerprint: string;
  location: string;
  revision: string;
  firstSeen: string;
  lastSeen: string;
  maskedEvidence?: string;
};

export type Finding = SourceInfo & {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  severity: FindingSeverity;
  category: FindingCategory;
  status: FindingStatus;
  productIds: string[];
  componentId: string;
  ownerTeamId: string;
  assignee: string;
  contexts: string[];
  due: string;
  remediation: LocalizedText;
  occurrences: FindingOccurrence[];
};

export type ThreatModelStatus = 'Draft' | 'In review' | 'Approved' | 'Needs review';
export type ThreatStatus = 'Open' | 'Mitigating' | 'Mitigated';

export type Threat = SourceInfo & {
  id: string;
  productId: string;
  targetType: 'Node' | 'Edge';
  targetId: string;
  title: LocalizedText;
  scenario: LocalizedText;
  stride: 'Spoofing' | 'Tampering' | 'Repudiation' | 'Information Disclosure' | 'Denial of Service' | 'Elevation of Privilege';
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  ownerTeamId: string;
  mitigation: LocalizedText;
  status: ThreatStatus;
};

export type ThreatModel = {
  id: string;
  productId: string;
  status: ThreatModelStatus;
  updatedAt: string;
  approvedBy?: string;
};

export type ControlType = 'SAST' | 'SCA' | 'Secrets' | 'IaC' | 'Threat Model';
export type CoverageStatus = 'Healthy' | 'Stale' | 'Gap' | 'Error' | 'Unknown' | 'Not applicable';

export type CoverageEvaluation = {
  id: string;
  productId: string;
  componentId?: string;
  control: ControlType;
  status: CoverageStatus;
  tool?: string;
  lastRun?: string;
  branch?: string;
  evidence?: string;
};

export type ScanReportStatus = 'Completed' | 'Completed with findings' | 'Failed';

export type ScanReport = SourceInfo & {
  id: string;
  componentId: string;
  control: Exclude<ControlType, 'Threat Model'>;
  tool: string;
  status: ScanReportStatus;
  startedAt: string;
  finishedAt: string;
  branch?: string;
  revision?: string;
  findingIds: string[];
};

export type ControlProfile = {
  id: string;
  name: LocalizedText;
  criticalities: Criticality[];
  requiredControls: ControlType[];
  freshnessDays: Partial<Record<ControlType, number>>;
  slaDays: Record<FindingSeverity, number>;
};

export type RiskException = {
  id: string;
  findingId: string;
  reason: string;
  approver: string;
  expiresAt: string;
  createdAt: string;
};

export type Integration = {
  id: string;
  name: string;
  kind: 'SCM' | 'Scanner' | 'Issue tracker' | 'Import';
  status: 'Connected' | 'Not connected' | 'Error';
  lastSync?: string;
  description: LocalizedText;
};

export type AtlasState = {
  products: Product[];
  components: Component[];
  infrastructureCatalog: InfrastructureCatalogItem[];
  repositories: Repository[];
  resources: ApplicationResource[];
  topologyNodes: TopologyNode[];
  topologyEdges: TopologyEdge[];
  teams: Team[];
  findings: Finding[];
  scanReports: ScanReport[];
  threats: Threat[];
  threatModels: ThreatModel[];
  coverage: CoverageEvaluation[];
  profiles: ControlProfile[];
  exceptions: RiskException[];
  integrations: Integration[];
};
