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

// Mock StarUML API
const app = {
  project: {
    getProject: () => ({ getClassName: () => "Project", ownedElements: [] })
  },
  factory: {
    createModel: (options) => {
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
        // Log view bounds to check for NaN
        console.log(`Created View for ${options.id}, left: ${view.left}, top: ${view.top}, width: ${view.width}, height: ${view.height}`);
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
  _parent: mockRegion
};

try {
  console.log("Starting parse...");
  stateParser.generateDiagram(diagram, pumlText);
  console.log("Parse completed successfully for UMLRegion parent!");
} catch (e) {
  console.error("Parse failed:", e);
}
