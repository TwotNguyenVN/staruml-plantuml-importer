module.exports = [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "**/*.{png,jpg,jpeg,gif,svg,webp,ico}"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        app: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        exports: "writable",
        global: "readonly",
        module: "writable",
        process: "readonly",
        cancelAnimationFrame: "readonly",
        require: "readonly",
        requestAnimationFrame: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
        structuredClone: "readonly",
        type: "readonly",
        window: "readonly",
        $: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-constant-condition": "error"
    }
  }
];
