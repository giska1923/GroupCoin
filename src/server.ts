import app from './app';
import config from './config/app.config';

const appConfig = config();

app.listen(appConfig.port, () => {
  console.log(`Server running on http://localhost:${appConfig.port}`);
});
