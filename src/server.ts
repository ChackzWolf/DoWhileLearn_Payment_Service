import dotenv from "dotenv";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import OrderController  from "./Controllers/Payment.Controllers";
import express from "express"
import morgan from 'morgan';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from "./Configs/Config";
import cors from 'cors';
const app = express();
app.use(cors({
  origin: 'http://localhost:5173',  // Frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());  // Allow preflight requests

app.use(express.json());





dotenv.config()



// error log
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine( 
      winston.format.timestamp(),
      winston.format.json()
    ), 
    transports: [
      new winston.transports.Console(), // Log to the console
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d' // Keep logs for 14 days
      })
    ],
  });
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
// error log end

const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, "protos/Payment.proto"),
    {keepCase:true , longs: String, enums: String , defaults: true, oneofs: true}
)


const paymentProto = grpc.loadPackageDefinition(packageDefinition) as any;

const server = new grpc.Server();
const port = config.port;

const grpcServer = () => {
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error("Error happened in gRPC service:", err);
                return;
            }
            console.log("PAYMENT_SERVICE running on port", port);
        }
    );
};

// Controller instantiation
const controller = new OrderController();

// Register the service with the controller
server.addService(paymentProto.PaymentService.service, {
    PurchasePayment: controller.createStripeSession,
    SuccessPayment: controller.HandleSuccessPayment
});

grpcServer(); // Start the gRPC server