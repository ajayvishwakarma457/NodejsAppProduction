import { SSTConfig } from "sst";
import { Api } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "nodejs-production-sst",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Stack({ stack }) {
      // Define Api gateway mapping to handler entrypoint
      const api = new Api(stack, "api", {
        routes: {
          "ANY /{proxy+}": {
            function: {
              handler: "../aws-lambda/handler.apiHandler",
              environment: {
                MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/prod_db",
              },
            },
          },
        },
      });

      // Output endpoint after successful deployment
      stack.addOutputs({
        ApiEndpoint: api.url,
      });
    });
  },
} satisfies SSTConfig;
