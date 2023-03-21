import app from "./app";

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`App is listeneing on http://localhost:${PORT}`);
  console.log(`Swagger-Document is on http://localhost:${PORT}/identrust/swagger`);
});
