const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './tez.sqlite', logging: false });
(async ()=> { await sequelize.authenticate(); console.log('SQLite ready'); process.exit(0); })();
