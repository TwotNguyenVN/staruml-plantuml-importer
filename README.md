# StarUML PlantUML Diagram Importer

🌍 **Language:** [English](README.md) | [Tiếng Việt](README-VN.md)

A StarUML extension that imports **Use Case, Class, Sequence, Activity, State, and ER Diagrams** from **PlantUML** syntax and auto-generates them as native UML elements inside StarUML.

## 📊 Supported & Planned Diagrams

| Diagram Type | Status | Notes |
|:---|:---|:---|
| **Use Case Diagram** | ✅ Supported | Column layout, system boundary |
| **Class Diagram** | ✅ Supported | Grid layout, full attributes/methods & associations |
| **Sequence Diagram** | ✅ Supported | Chronological layout, message types, actor lifelines |
| **Activity Diagram** | ✅ Supported | Partition swimlanes, action flows, and decisions |
| **State Diagram** | ✅ Supported | Composite states, region sub-containers, transitions |
| **ER Diagram** | ✅ Supported | Entities, columns (PK/FK/Nullable), crow's foot cardinalities |
| **Mindmap** | ⏳ Planned | Planned for future update |
| **Requirement Diagram** | ⏳ Planned | Planned for future update |

## ✨ Features

- **Live Server Preview:** Interactive side-by-side modal displaying diagram preview rendered directly from the PlantUML server.
- Parse PlantUML Use Case, Class, Sequence, Activity, State, and ER Diagram syntax.
- Smart layout algorithms: Grid layout for Class, column distribution for Use Case, chronological timeline layout for Sequence, swimlane coordinate mapping for Activity, and nested containment for State.
- Support for attributes, operations, visibilities, and multiplicities (Class Diagram).
- Support for `<<include>>`, `<<extend>>`, generalization, interface realization, associations, aggregations, and compositions.
- Support for lifelines (`actor`, `participant`, `boundary`, `control`, `entity`, `database`, `collections`) and message lines (`->`, `-->`, `->>`, `->*`, `->x`) in Sequence Diagrams.
- Support for ERD columns (Primary Keys, Foreign Keys, Nullability) and crow's foot notation.
- Compatible with **StarUML v7+**

## 📦 Installation

### Quick Install

#### Windows
1. Download or clone this repository
2. **Double-click** `install.bat`
3. Restart StarUML

#### macOS / Linux
```bash
chmod +x install.sh
./install.sh
```

### Manual Installation

Copy the content of this repository (or the folder `staruml-plantuml-importer`) to:

| OS      | Path                                                                   |
|---------|------------------------------------------------------------------------|
| Windows | `%APPDATA%\StarUML\extensions\user\staruml-plantuml-importer`           |
| macOS   | `~/Library/Application Support/StarUML/extensions/user/staruml-plantuml-importer` |
| Linux   | `~/.config/StarUML/extensions/user/staruml-plantuml-importer`           |

Then restart StarUML.

## 🚀 How to Use

1. Open StarUML
2. Create a Diagram:
   - For Use Case: `Model` → `Add Diagram` → `Use Case Diagram`
   - For Class: `Model` → `Add Diagram` → `Class Diagram`
   - For Sequence: `Model` → `Add Diagram` → `Sequence Diagram`
   - For Activity: `Model` → `Add Diagram` → `Activity Diagram`
   - For State: `Model` → `Add Diagram` → `Statechart Diagram`
   - For ERD: `Model` → `Add Diagram` → `ER Diagram`
3. Go to `Tools` → `PlantUML Importer` → Select your import command
4. Paste your PlantUML code in the dialog
5. Click **Preview** to render and check the diagram from the server, then click **Import** — the diagram will be generated automatically!

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

### State Diagram

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

## 🗑️ Clean Uninstallation (Windows & macOS)

If you need to completely remove StarUML and all of its configurations, caches, extensions, and logs from your device, you can use the provided uninstaller script.

#### Windows
**Double-click** `clear.bat` or run it from command prompt.

#### macOS
Run:
```bash
chmod +x clear.sh
./clear.sh
```

## 📄 License

MIT

