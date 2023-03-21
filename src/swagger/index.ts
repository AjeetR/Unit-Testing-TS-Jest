import fs from "fs";
import express, { NextFunction } from "express";
import swaggerUi, { SwaggerOptions } from "swagger-ui-express";

const router = express.Router();
export default router;

const options = {
  explorer: false,
  deepLinking: true,
  swaggerOptions: {
    // The "Try it out!" button doesn't work without HAWK Authentication, so
    // disable it for all methods...
    // ["get", "put", "post", "delete", "options", "head", "patch", "trace"]
    supportedSubmitMethods: [""],
  },
  customCss: ".swagger-ui .topbar { display: none }",
};

// setup swagger to serve everything is this route
router.use("/", swaggerUi.serve);

const swagger_config: { filename: string; path: string }[] = [
  { filename: "swagger.json", path: "/" },
];
if (process.env.S3_BUCKET_URL) {
  swagger_config.pop();
  swagger_config.pop();
}
for (let i = 0; i < swagger_config.length; i += 1) {
  router.get(
    `/${swagger_config[i].filename}`,
    function (req: express.Request, res: express.Response, next: NextFunction) {
      res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.header("Expires", "-1");
      res.header("Pragma", "no-cache");
      try {
        const fileContents = fs.readFileSync(`swagger/${swagger_config[i].filename}`, "utf8");

        // Mime-type required?
        if (
          swagger_config[i].filename.toLowerCase().endsWith("yaml") ||
          swagger_config[i].filename.toLowerCase().endsWith("yml")
        ) {
          res.setHeader("Content-Type", "text/yaml");
        } else {
          res.setHeader("Content-Type", "application/json");
        }
        res.send(fileContents);
      } catch (e) {
        next(e);
      }
    }
  );

  const swaggerDocument = JSON.parse(fs.readFileSync("swagger/swagger.json", "utf8"));

  router.get(
    swagger_config[i].path,
    function (req: SwaggerOptions, res, next) {
      res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.header("Expires", "-1");
      res.header("Pragma", "no-cache");

      // figure out which doc to use...
      let path = req.path.replace(/swagger.*/gi, "");
      if (path !== "/" && path.endsWith("/")) {
        path = path.slice(0, -1);
      }
      const swaggerConfig = swagger_config.find((con) => {
        return con.path === path;
      });
      if (swaggerConfig) {
        req.swaggerDoc = swaggerDocument;
        next();
      }
    },
    swaggerUi.setup(swaggerDocument, options)
  );
}
