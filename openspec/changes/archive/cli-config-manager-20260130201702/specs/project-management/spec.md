# Project Management Capability

## ADDED Requirements

### Requirement: Project Creation
The system SHALL create projects as containers for CLI configurations.

#### Scenario: Create New Project
**Given** CLI "AAA" is registered in settings.cliRegistry
**When** user creates project "MyProject" and selects CLI "AAA"
**Then** directory Projects/MyProject/ is created
**And** project.json is created with projectName="MyProject"
**And** project.json contains linkedCLIs.AAA.snapshotInstallPath

#### Scenario: Reject Project Without CLI Registration
**Given** settings.cliRegistry is empty
**When** user attempts to create a new project
**Then** "New Project" button is disabled or shows error
**And** user is prompted to configure CLI paths first

#### Scenario: Reject Duplicate Project Name Case Insensitive
**Given** project "MyProject" exists
**When** user attempts to create project "myproject" or "MYPROJECT"
**Then** operation fails with error "Project already exists"

---

### Requirement: Project CLI Linking
The system SHALL link CLIs to projects with snapshotted installPath.

#### Scenario: Link CLI to Existing Project
**Given** project "MyProject" exists
**And** CLI "BBB" is registered with installPath "D:\Tools\BBB"
**When** user adds CLI "BBB" to project "MyProject"
**Then** project.json.linkedCLIs.BBB.snapshotInstallPath = "D:\Tools\BBB"
**And** Import flow is triggered for CLI "BBB"

#### Scenario: Preserve snapshotInstallPath on Global Change
**Given** project "MyProject" has CLI "AAA" linked with snapshotInstallPath "C:\Old\Path"
**When** user changes global cliRegistry.AAA.installPath to "C:\New\Path"
**Then** project.json.linkedCLIs.AAA.snapshotInstallPath remains "C:\Old\Path"
**And** project operations use the snapshotted path

---

### Requirement: Project CLI Removal
The system SHALL remove CLI from project while preserving backup history.

#### Scenario: Remove CLI from Project
**Given** project "MyProject" has CLI "AAA" linked
**And** backup/ contains snapshots with AAA data
**When** user removes CLI "AAA" from project
**Then** Projects/MyProject/AAA/ directory is deleted
**And** project.json.linkedCLIs.AAA is removed
**And** backup/ snapshots are preserved and not deleted
**And** warning dialog shows: "This will delete CLI configuration copy but preserve backups"
