# File Operations Capability

## ADDED Requirements

### Requirement: Import CLI Configuration
The system SHALL copy files from CLI installPath to project Working Copy, respecting Ignore Rules.

#### Scenario: Import with Ignore Rules
**Given** CLI "AAA" is registered with installPath "C:\Users\a\.AAA"
**And** installPath contains files: config.json, debug.log, settings/user.json
**And** global Ignore Rules include "*.log"
**When** user imports CLI "AAA" into project "MyProject"
**Then** Working Copy contains: config.json, settings/user.json
**And** Working Copy does NOT contain: debug.log

#### Scenario: Import without CLI Registration
**Given** CLI "BBB" is NOT registered in settings.cliRegistry
**When** user attempts to import CLI "BBB" into project "MyProject"
**Then** operation fails with error "CLI not registered"
**And** no files are created in Working Copy

---

### Requirement: Backup Snapshot Creation
The system SHALL create directory snapshots with millisecond-precision timestamps.

#### Scenario: Manual Backup Full
**Given** project "MyProject" has CLI "AAA" linked
**And** installPath contains 10 files totaling 5MB
**When** user triggers manual backup
**Then** snapshot directory "bak{yyyyMMddHHmmssSSS}" is created
**And** meta.json contains snapshotType="full"
**And** all non-ignored files are copied to snapshot

#### Scenario: Backup Atomicity on Failure
**Given** project "MyProject" has CLI "AAA" linked
**And** one file in installPath is locked by another process
**When** backup operation encounters the locked file
**Then** partial snapshot directory is deleted (rollback)
**And** operation fails with error listing the locked file
**And** no incomplete snapshot remains

---

### Requirement: Apply Configuration
The system SHALL copy files from Working Copy to installPath with auto-backup.

#### Scenario: Apply with Auto-Backup
**Given** project "MyProject" has CLI "AAA" with modified config.json
**When** user applies changes to CLI "AAA"
**Then** auto-backup snapshot is created BEFORE any writes
**And** config.json is copied to installPath
**And** meta.json contains source="auto-apply-backup"

#### Scenario: Apply Failure with Auto-Rollback
**Given** project "MyProject" has CLI "AAA" with 5 modified files
**And** auto-backup completes successfully
**When** Apply fails after copying 2 files due to permission denied
**Then** installPath is automatically restored from the auto-backup
**And** installPath matches pre-apply state exactly
**And** error message lists the failed files

#### Scenario: Apply Respects Ignore Rules
**Given** Working Copy contains: config.json, debug.log
**And** global Ignore Rules include "*.log"
**When** user applies changes
**Then** config.json is copied to installPath
**And** debug.log is NOT copied to installPath
**And** existing debug.log in installPath is unchanged

---

### Requirement: Restore from Snapshot
The system SHALL restore files from snapshot to installPath, ignoring current Ignore Rules.

#### Scenario: Restore Full Snapshot
**Given** snapshot "bak20260130152301123" exists with snapshotType="full"
**And** snapshot contains: config.json, debug.log
**And** current Ignore Rules include "*.log"
**When** user restores from this snapshot
**Then** both config.json AND debug.log are restored to installPath
**And** warning is displayed: "Restore ignores current Ignore Rules"

#### Scenario: Restore Partial Snapshot Constraint
**Given** snapshot "bak20260130160000123" exists with snapshotType="partial"
**And** snapshot only contains: settings/user.json
**When** user attempts "Restore All CLI" operation
**Then** operation is blocked
**And** UI displays: "Partial snapshot cannot restore entire CLI"
**And** user can only restore files within snapshot scope

---

### Requirement: Symlink Junction Handling
The system SHALL skip symbolic links and junctions during file operations.

#### Scenario: Skip Symlink During Import
**Given** installPath contains a symlink "link_to_external" pointing outside installPath
**When** user imports CLI
**Then** symlink is skipped and not copied
**And** warning is logged: "Skipped symlink: link_to_external"
**And** all regular files are imported normally

---

### Requirement: Large File Warning
The system SHALL warn users before processing files larger than 100MB.

#### Scenario: Large File Confirmation
**Given** installPath contains "large_model.bin" at 150MB
**When** user triggers Import
**Then** warning dialog appears: "File exceeds 100MB: large_model.bin"
**And** user can choose to proceed or cancel
**And** if user cancels then no files are imported
**And** if user proceeds then all files including large_model.bin are imported

---

### Requirement: Snapshot Retention
The system SHALL maintain at most 5 snapshots per project.

#### Scenario: Auto-Cleanup on 6th Snapshot
**Given** project "MyProject" has 5 existing snapshots
**And** oldest snapshot is "bak20260101000000000"
**When** a new backup is created
**Then** "bak20260101000000000" is automatically deleted
**And** project has exactly 5 snapshots
**And** remaining snapshots are the 5 newest by timestamp
