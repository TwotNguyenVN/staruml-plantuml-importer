require('./fail_on_console_error.js');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const parser = require('../parsers/sequence-parser.js');

const text = fs.readFileSync(path.join(__dirname, 'sequence-diagram2.puml'), 'utf8');

let createdCount = 0;
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
            insert: () => { createdCount++; },
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
            createdCount++;
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
    const result = parser.generateDiagram(mockDiagram, text);
    assert.strictEqual(result.success, true, "Import should succeed");
    assert.strictEqual(result.diagramType, "UMLSequenceDiagram", "Expected UMLSequenceDiagram");
    assert.deepStrictEqual(result.errors, [], "Errors should be empty");
    assert.ok(result.createdCount > 0, "Created count should be greater than 0");
    console.log("Success: run_sequence_parser_test completed successfully.");
} catch (e) {
    console.error("ERROR:", e);
    process.exit(1);
}
