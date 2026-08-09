require('./fail_on_console_error.js');
const path = require('path');
const assert = require('assert');
const stateParser = require('../parsers/state-parser');

const pumlText = `
@startuml
title State Diagram - Composite State with Regions

[*] --> TaoDonHang

TaoDonHang --> DangXuLy : Khách xác nhận đơn

state DangXuLy {
  
  state "Region 1: Thanh toán" as Payment {
    [*] --> ChoThanhToan
    ChoThanhToan --> DaThanhToan : Thanh toán thành công
    ChoThanhToan --> ThanhToanThatBai : Thanh toán lỗi
    ThanhToanThatBai --> ChoThanhToan : Thử lại
    DaThanhToan --> [*]
  }

  --

  state "Region 2: Kho hàng" as Inventory {
    [*] --> KiemTraTonKho
    KiemTraTonKho --> DaGiuHang : Còn hàng
    KiemTraTonKho --> HetHang : Hết hàng
    DaGiuHang --> [*]
  }

  --

  state "Region 3: Giao hàng" as Delivery {
    [*] --> ChuanBiGiao
    ChuanBiGiao --> DangGiao : Bàn giao shipper
    DangGiao --> DaGiao : Giao thành công
    DaGiao --> [*]
  }
}

DangXuLy --> HoanTat : Thanh toán + giữ hàng + giao thành công
DangXuLy --> HuyDon : Thanh toán thất bại hoặc hết hàng

HoanTat --> [*]
HuyDon --> [*]

@enduml
`;

let createdCount = 0;
// Mock StarUML API
const app = {
  dialogs: {
    showAlertDialog: (msg) => console.error("ALERT:", msg),
    showInfoDialog: (msg) => console.log("INFO:", msg)
  },
  project: {
    getProject: () => ({ getClassName: () => "Project", ownedElements: [] })
  },
  factory: {
    createModel: (options) => {
      createdCount++;
      let model = {
        getClassName: () => options.id,
        name: options.id + "_Mock",
        _parent: options.parent,
        regions: [],
        ownedElements: []
      };
      if (options.modelInitializer) options.modelInitializer(model);
      return model;
    },
    createModelAndView: (options) => {
      createdCount++;
      let view = {
        model: {
          getClassName: () => options.id.replace("View", ""),
          regions: [],
          _parent: options.parent
        }
      };
      if (options.modelInitializer) options.modelInitializer(view.model);
      if (options.viewInitializer) {
        options.viewInitializer(view);
      }
      return view;
    }
  }
};

global.app = app;

const mockRegion = {
  getClassName: () => "UMLRegion",
  _parent: {
    getClassName: () => "UMLStateMachine"
  }
};

const diagram = {
  getClassName: () => "UMLStatechartDiagram",
  _parent: mockRegion,
  ownedViews: []
};

try {
  const result = stateParser.generateDiagram(diagram, pumlText);
  assert.strictEqual(result.success, true, "Import should succeed");
  assert.strictEqual(result.diagramType, "UMLStatechartDiagram", "Expected UMLStatechartDiagram");
  assert.deepStrictEqual(result.errors, [], "Errors should be empty");
  assert.ok(result.createdCount > 0, "Created count should be greater than 0");
  console.log("Success: run_state_test completed successfully.");
} catch (e) {
  console.error("Parse failed:", e);
  process.exit(1);
}
