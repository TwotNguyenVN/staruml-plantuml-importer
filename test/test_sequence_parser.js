const fs = require('fs');
const path = require('path');
const parser = require('../parsers/sequence-parser.js');

const text = fs.readFileSync(path.join(__dirname, 'sequence-diagram2.puml'), 'utf8');

// Mock StarUML app object
global.app = {
    project: {
        getProject: () => ({ _parent: null })
    },
    type: {
        UMLActor: class {},
        UMLAttribute: class {},
        UMLLifeline: class {},
        UMLSeqLifelineView: class { initialize() {} },
        UMLMessage: class {},
        UMLSeqMessageView: class { initialize() {} },
        UMLGeneralNodeView: { SD_ICON: 1 }
    },
    repository: {
        getOperationBuilder: () => ({
            begin: () => {},
            insert: () => {},
            fieldInsert: () => {},
            end: () => {},
            getOperation: () => ({}),
            discard: () => {}
        }),
        doOperation: () => {}
    },
    diagrams: {
        setCurrentDiagram: () => {}
    },
    factory: {
        createModelAndView: (options) => {
            console.log(`[Mock Factory] createModelAndView called with id: ${options.id}`);
            const mockModel = {};
            const mockView = { model: mockModel };
            
            if (options.modelInitializer) options.modelInitializer(mockModel);
            if (options.viewInitializer) options.viewInitializer(mockView);
            
            return mockView;
        }
    }
};

const mockDiagram = { _parent: { _parent: null } };

try {
    console.log("Starting sequence parser test...");
    parser.generateDiagram(mockDiagram, text);
    console.log("SUCCESS: sequence parser finished without throwing exceptions.");
} catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
}
