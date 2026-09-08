// Package docs provides the embedded OpenAPI documents served by the API.
package docs

import _ "embed"

//go:embed openapi.yaml
var OpenAPIYAML []byte

//go:embed openapi.json
var OpenAPIJSON []byte

// SwaggerUIHTML loads Swagger UI and the OpenAPI document served by this API.
const SwaggerUIHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ALPA Inventory API</title>
  <link rel="stylesheet" href="/docs/swagger-ui/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: "/docs/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`
