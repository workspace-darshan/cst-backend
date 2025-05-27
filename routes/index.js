var express = require("express");
const routes = express.Router();

const users = require("./users");
routes.use('/users', users.route);

const projects = require("./projects");
routes.use('/projects', projects.route);

const services = require("./services");
routes.use('/services', services.route);

const common = require("./common");
routes.use('/common', common.route);

const contact = require("./contact");
routes.use('/contact', contact.route);

module.exports = routes;
