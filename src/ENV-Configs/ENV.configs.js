"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.configs = {
    // GRPC PORT CONFIGS
    PAYMENT_GRPC_PORT: process.env.PAYMENT_GRPC_PORT || 5007,
    // PAYMENT GATEWAY CONFIGS
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    // LOGGER CONFIGS
    LOG_RETENTION_DAYS: process.env.LOG_RETENTION_DAYS || '7d'
};
