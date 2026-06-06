module.exports = {
    apps: [
        {
            name: "inventory_plnup3",
            script: "./build/index.js",
            env: {
                PORT: 3000
            }
        }
    ]
};