// const swaggerJSDoc = require("swagger-jsdoc");

// const options = {
//   definition: {
//     openapi: "3.0.0",

//     info: {
//       title: "Wallet API",
//       version: "1.0.0",
//       description: "Wallet + NFT + Transaction Backend APIs",
//     },

//     servers: [
//       {
//         url: "http://localhost:5000",
//       },
//     ],
//   },

//   apis: ["./server.js"], // tells swagger to scan server.js
// };

// const swaggerSpec = swaggerJSDoc(options);

// module.exports = swaggerSpec;





const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Wallet API",
      version: "1.0.0",
    },

    servers: [
      {
        url: "http://localhost:5000",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

  },

  apis: ["./server.js"],
};

module.exports = swaggerJSDoc(options);
