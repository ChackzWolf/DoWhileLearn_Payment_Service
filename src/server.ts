import dotenv from "dotenv";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import OrderController  from "./Controllers/Payment.controllers";
import express from "express"
import morgan from 'morgan';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { configs } from "./ENV-Configs/ENV.configs";
import cors from 'cors';
// import { initializeProducer, sendMessage } from "";
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
        maxFiles: configs.LOG_RETENTION_DAYS
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
    path.join(__dirname, "Protos/Payment.proto"),
    {keepCase:true , longs: String, enums: String , defaults: true, oneofs: true}
)


const paymentProto = grpc.loadPackageDefinition(packageDefinition) as any;

const server = new grpc.Server();
const port = configs.PAYMENT_GRPC_PORT;

const grpcServer = async () => {

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

 
  

import KafkaController from "./Controllers/Kafka.controller";
import { kafkaConfig } from "./ENV-Configs/KafkaConfig";
export interface OrderEventData {
  userId: string;
  tutorId: string; 
  courseId: string; 
  transactionId: string; 
  title: string; 
  thumbnail: string; 
  price: string;  
  adminShare: string; 
  tutorShare: string;  
  paymentStatus:boolean; 
  timestamp: Date;
  status: string;
} 

const event: OrderEventData = {
  transactionId: '66ka779q1e683ad9f152742',
  userId: "66ea78665e7e3a29f1527107",
  tutorId: "data.tutorId",
  courseId: "66ed5a17f1e073986aa7a0d6",
  title: "data.title",
  thumbnail: "data.thumbnail",
  price: "data.price",
  adminShare: "100",  
  tutorShare: "100",
  paymentStatus:true, 
  timestamp: new Date(),
  status: "SUCCESS"
}; 
app.use(express.json());
 

const PORT = configs.PORT || 3007;
app.listen(PORT, async() => {
const kafkaController = new KafkaController();

  console.log(`Payment service running on port ${PORT}`); 

  console.log('agter it')
  const response = await kafkaConfig.handlePaymentTransaction(event);
  console.log(response, 'response')
});                     