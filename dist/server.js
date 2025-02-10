"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const Payment_Controllers_1 = __importDefault(require("./Controllers/Payment.Controllers"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const ENV_configs_1 = require("./ENV-Configs/ENV.configs");
const cors_1 = __importDefault(require("cors"));
// import { initializeProducer, sendMessage } from "";
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', (0, cors_1.default)()); // Allow preflight requests
app.use(express_1.default.json());
dotenv_1.default.config();
// error log
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(), // Log to the console
        new winston_daily_rotate_file_1.default({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: ENV_configs_1.configs.LOG_RETENTION_DAYS
        })
    ],
});
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
// error log end
const packageDefinition = protoLoader.loadSync(path_1.default.join(__dirname, "protos/Payment.proto"), { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const paymentProto = grpc.loadPackageDefinition(packageDefinition);
const server = new grpc.Server();
const port = ENV_configs_1.configs.PAYMENT_GRPC_PORT;
const grpcServer = () => __awaiter(void 0, void 0, void 0, function* () {
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error("Error happened in gRPC service:", err);
            return;
        }
        console.log("PAYMENT_SERVICE running on port", port);
    });
});
// Controller instantiation
const controller = new Payment_Controllers_1.default();
// Register the service with the controller
server.addService(paymentProto.PaymentService.service, {
    PurchasePayment: controller.createStripeSession,
    SuccessPayment: controller.HandleSuccessPayment
});
grpcServer(); // Start the gRPC server
const Kafka_controller_1 = __importDefault(require("./Controllers/Kafka.controller"));
const event = {
    transactionId: '66ka779q1e683ad9f152742',
    userId: "66ea78665e7e3a29f1527107",
    tutorId: "data.tutorId",
    courseId: "66ed5a17f1e073986aa7a0d6",
    title: "data.title",
    thumbnail: "data.thumbnail",
    price: "data.price",
    adminShare: "100",
    tutorShare: "100",
    paymentStatus: true,
    timestamp: new Date(),
    status: "SUCCESS"
};
app.use(express_1.default.json());
const PORT = ENV_configs_1.configs.PORT || 3007;
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    const kafkaController = new Kafka_controller_1.default();
}));
