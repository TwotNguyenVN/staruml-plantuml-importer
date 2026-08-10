# PlantUML Importer

[![GitHub Release](https://img.shields.io/github/v/release/TwotNguyenVN/staruml-plantuml-importer?style=flat-square&color=blue)](https://github.com/TwotNguyenVN/staruml-plantuml-importer/releases)
[![StarUML Version](https://img.shields.io/badge/StarUML-v7%2B-orange?style=flat-square)](https://staruml.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/TwotNguyenVN/staruml-plantuml-importer?style=flat-square&color=yellow)](https://github.com/TwotNguyenVN/staruml-plantuml-importer/stargazers)
[![GitHub Downloads](https://img.shields.io/github/downloads/TwotNguyenVN/staruml-plantuml-importer/total?style=flat-square&color=brightgreen)](https://github.com/TwotNguyenVN/staruml-plantuml-importer/releases)

🌍 **Language:** [English](README.md) | [Tiếng Việt](README-VN.md)

A StarUML extension that imports **Use Case, Class, Sequence, Activity, and ER Diagrams** from **PlantUML** syntax and auto-generates them as native UML elements inside StarUML.

## 📊 Supported & Planned Diagrams

| Diagram Type | Status | Notes |
|:---|:---|:---|
| **Use Case Diagram** | ✅ Supported | Column layout, system boundary |
| **Class Diagram** | ✅ Supported | Grid layout, full attributes/methods & associations |
| **Sequence Diagram** | ✅ Supported | Chronological layout, message types, actor lifelines |
| **Activity Diagram** | ✅ Supported | Partition swimlanes, action flows, and decisions |
| **State Diagram** | 🚧 In Progress | Composite states / orthogonal regions can still fail StarUML's placement validation; not stable yet |
| **ER Diagram** | ✅ Supported | Entities, columns (PK/FK/Nullable), crow's foot cardinalities |
| **Mindmap Diagram** | ✅ Supported | Radial layout, deep hierarchies, left/right direction support |
| **Requirement Diagram** | ✅ Supported | SysMLRequirements, elements, all relation types |

## ✨ Features

- **Live Server Preview:** Interactive side-by-side modal displaying diagram preview rendered directly from the PlantUML server.
- Parse PlantUML Use Case, Class, Sequence, Activity, ERD, and Mindmap Diagram syntax (State Diagram parsing exists but is still unstable — see status table above).
- Smart layout algorithms: 
  - **Enhanced Sugiyama Hierarchical Layout** for Class Diagrams to minimize edge crossings.
  - **Dynamic Width Occupancy Grid Layout** for Activity Diagrams to automatically adjust swimlanes and prevent overlapping.
  - Column distribution for Use Case, chronological timeline layout for Sequence, and nested containment for State.
- Support for attributes, operations, visibilities, and multiplicities (Class Diagram).
- Support for `<<include>>`, `<<extend>>`, generalization, interface realization, associations, aggregations, and compositions.
- Support for lifelines (`actor`, `participant`, `boundary`, `control`, `entity`, `database`, `collections`) and message lines (`->`, `-->`, `->>`, `->*`, `->x`) in Sequence Diagrams.
- Support for ERD columns (Primary Keys, Foreign Keys, Nullability) and crow's foot notation.
- Compatible with **StarUML v7+**

## 🔒 Privacy & Preview Server Configuration

By default, the Live Server Preview sends your PlantUML code (in compressed/encoded form) to the public PlantUML rendering server (`https://www.plantuml.com/plantuml`) to fetch a visual preview image of the diagram.

If you are working with sensitive data or proprietary software architecture, you can configure your own private, self-hosted PlantUML server or disable the preview entirely:

1. Open **StarUML**.
2. Go to **StarUML > Preferences > PlantUML Importer**.
3. Customize the settings:
   - **PlantUML Server URL**: Set to your self-hosted PlantUML instance (e.g., `http://localhost:8080` or `https://plantuml.yourcompany.com`). The extension automatically normalizes the URL (e.g., strips redundant trailing slashes/paths like `/png`) and prioritizes HTTPS for remote domains.
   - **Enable Preview**: Uncheck this box to disable the preview server completely. When disabled, the extension will not send any diagram code to the network, and the preview screen will display a disabled message.

## 📦 Installation & Management

This extension comes with a unified, cross-platform management script (`manage.js`) that handles installation, updates, and uninstallation across Windows, macOS, and Linux.

**Requirements:** [Node.js](https://nodejs.org/) installed on your machine.

### Usage

Open your terminal at the root of the repository. You can use the tool in two ways:

#### 1. Interactive Mode (Recommended)
Run the following command to open the interactive menu and follow the on-screen instructions:
```bash
node manage.js
```

#### 2. Quick Command-Line Mode
- **Install extension:**
  ```bash
  node manage.js install
  ```
- **Update extension:** (Pulls the latest code from GitHub and reinstalls)
  ```bash
  node manage.js update
  ```
- **Remove extension:** (Only removes the extension from StarUML)
  ```bash
  node manage.js clear
  ```

#### 3. Native Scripts Mode (No Node.js required)
If you don't have Node.js installed, you can directly run the OS-specific scripts:

**For Windows:**
- **Install extension:** Double-click the `install.bat` file or run `.\install.bat` in Command Prompt.

**For macOS / Linux:**
- **Install extension:** Open Terminal in the project directory and run:
  ```bash
  chmod +x install.sh
  ./install.sh
  ```

> **💡 Note:** After installing or updating, please restart StarUML.

## 🚀 How to Use

1. Open StarUML
2. Create a Diagram:
   - For Use Case: `Model` → `Add Diagram` → `Use Case Diagram`
   - For Class: `Model` → `Add Diagram` → `Class Diagram`
   - For Sequence: `Model` → `Add Diagram` → `Sequence Diagram`
   - For Activity: `Model` → `Add Diagram` → `Activity Diagram`
   - For State: `Model` → `Add Diagram` → `Statechart Diagram`
   - For ERD: `Model` → `Add Diagram` → `ER Diagram`
3. Go to menu **`Tools` → `PlantUML Importer...`** or use the shortcut:
   - **Mac:** `Cmd + I`
   - **Windows/Linux:** `Ctrl + I`
   
   *(💡 Tip: Press the shortcut again to quickly close the dialog. The cursor will auto-focus so you can paste your code immediately!)*

   ![Step 1](picture/step1.png)

4. The importer dialog will appear.

   ![Step 2](picture/step2.png)

5. Paste your PlantUML code into the input field; the Preview will be displayed on the right.

   ![Step 3](picture/step3.png)

6. Click **Import** and wait for the tool to process.

   ![Step 4](picture/step4.png)

7. Click **OK**, then view and edit your generated diagram.

   ![Step 5](picture/step5.png)

## 📝 Supported PlantUML Syntax

### Use Case Diagram

```plantuml
@startuml
actor "Guest" as Guest
actor "Member" as Member
actor "Admin" as Admin

Member --|> Guest

rectangle "My System" {
    usecase "Login" as UC1
    usecase "Search" as UC2
    usecase "Order" as UC3
    usecase "Manage Users" as UC4
}

Guest --> UC1
Guest --> UC2
Member --> UC3
Admin --> UC4
UC3 ..> UC1 : <<include>>
@enduml
```

### Class Diagram

```plantuml
@startuml
class User {
    - userId: String
    - fullName: String
    + login(username: String): boolean
}

class Member {
    - memberCode: String
    + borrowBook(bookCopyId: String): Loan
}

User <|-- Member
@enduml
```

### Sequence Diagram

```plantuml
@startuml
actor User as U
participant "Auth Service" as Auth
database DB as DB

U -> Auth : Login Request
Auth -> DB : Query User
DB --> Auth : User Data
Auth --> U : Token / Response
@enduml
```

### Activity Diagram

```plantuml
@startuml
|Actor|
start
:Action 1;
if (Decision?) then (yes)
  :Action 2;
else (no)
  :Action 3;
endif
stop
@enduml
```

### State Diagram (🚧 In Progress — not stable yet)

```plantuml
@startuml
[*] --> Active
state Active {
  [*] --> Idle
  Idle --> Processing : trigger
}
Active --> [*] : shutdown
@enduml
```

### ER Diagram

```plantuml
@startuml
entity User {
  * user_id : number <<generated>>
  --
  * username : varchar(50)
  email : varchar(100)
}
entity Order {
  * order_id : number
  --
  * user_id : number <<FK>>
}
User ||--o{ Order
@enduml
```

### Requirement Diagram

```plantuml
@startuml
requirement "User can log in" as R1 {
  id: 1
  text: The system shall allow a registered user to log in.
  risk: low
  verifymethod: test
}
requirement "User can reset password" as R2
element "Auth Service" as E1

R1 -satisfies-> E1
R2 -refines-> R1
@enduml
```

## 📋 StarUML Integration Checklist & Representative Fixtures

This table acts as our integration checklist. It maps each diagram type to its respective parser file and the representative test fixtures in the `test/` folder that verify its parsing logic and correctness:

| Diagram Type | StarUML Element Type | Parser Module | Test Fixture File | Stability Status |
| :--- | :--- | :--- | :--- | :--- |
| **Use Case Diagram** | `UMLUseCaseDiagram` | `parsers/usecase-parser.js` | [usecaseC1.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/usecaseC1.puml) | Stable |
| **Class Diagram** | `UMLClassDiagram` | `parsers/class-parser.js` | [classdiagram.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/classdiagram.puml) | Stable |
| **Sequence Diagram** | `UMLSequenceDiagram` | `parsers/sequence-parser.js` | [sequence-diagram2.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/sequence-diagram2.puml) | Stable |
| **Activity Diagram** | `UMLActivityDiagram` | `parsers/activity-parser.js` | [Activity.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/Activity.puml) | Stable |
| **State Diagram** | `UMLStatechartDiagram` | `parsers/state-parser.js` | [Statechart_Diagram.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/Statechart_Diagram.puml) | **🚧 In Progress / Unstable** |
| **ER Diagram** | `ERDDiagram` | `parsers/erd-parser.js` | [ERD.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/ERD.puml) | Stable |
| **Mindmap Diagram** | `MindmapDiagram` (MMDiagram) | `parsers/mindmap-parser.js` | [mindmap.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/mindmap.puml) | Stable |
| **Requirement Diagram** | `SysMLRequirementDiagram` | `parsers/requirement-parser.js` | [requirement_sample.puml](file:///Users/twot/Documents/CODE/staruml-plantuml-importer/test/requirement_sample.puml) | Stable |

## 🗑️ Clean Uninstallation of StarUML (Windows & macOS)

> **⚠️ WARNING:** The following command **DOES NOT** just uninstall the extension. It will **COMPLETELY UNINSTALL** the StarUML application from your system and wipe all of its configurations, caches, extensions, and logs. Only use this if you want a fresh start or want to remove StarUML completely!
> (The script will prompt for a `y/N` confirmation before proceeding).

```bash
node manage.js clear-all
```

**Using Native Scripts (No Node.js required):**
- **Windows:** Double-click the `clear.bat` file or run `.\clear.bat` in Command Prompt.
- **macOS / Linux:** Open Terminal and run:
  ```bash
  chmod +x clear.sh
  ./clear.sh
  ```

## 📄 License

MIT

