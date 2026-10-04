export default [
    {
        files: ["**/*.js"],

        languageOptions: {
            globals: {
                browser: "readonly",
                console: "readonly"
            }
        },

        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "no-unreachable": "error"
        }
    }
];
