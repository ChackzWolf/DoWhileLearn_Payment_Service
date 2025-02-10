"use strict";
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
const debug_1 = __importDefault(require("debug"));
const kafkajs_1 = require("kafkajs");
const ENV_configs_1 = require("../ENV-Configs/ENV.configs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger = (0, debug_1.default)('node-kafka:KafkaController');
class KafkaController {
    constructor() {
        this.kafka = new kafkajs_1.Kafka({
            clientId: ENV_configs_1.configs.CLIENT_ID,
            brokers: [ENV_configs_1.configs.BROKER_1],
        });
    }
    createTopic(topicName, noOfPartition) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = this.kafka.admin();
                yield admin.connect();
                yield admin.createTopics({
                    topics: [{
                            topic: topicName,
                            numPartitions: noOfPartition,
                            replicationFactor: 1,
                        }],
                });
                yield admin.disconnect();
                console.log("Topic successfully created.");
            }
            catch (error) {
                logger(error);
                console.log('Failed to create topic.');
            }
        });
    }
    publishMessageToTopic(topicName, messages) {
        return __awaiter(this, void 0, void 0, function* () {
            const producer = this.kafka.producer();
            try {
                yield producer.connect();
                yield producer.send({
                    topic: topicName,
                    messages,
                });
                console.log('message has send');
            }
            catch (error) {
                console.log('error, error, error', error);
            }
            finally {
                yield producer.disconnect();
            }
        });
    }
    consumerMessageFromTopic(topicName) {
        return __awaiter(this, void 0, void 0, function* () {
            const consumer = this.kafka.consumer({ groupId: 'test-group' });
            try {
                yield consumer.connect();
                yield consumer.subscribe({
                    topic: topicName,
                    fromBeginning: true,
                });
                yield consumer.run({
                    eachMessage: (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                        var _b;
                        const value = `Recieved message: ${(_b = message.value) === null || _b === void 0 ? void 0 : _b.toString()} from partition. & topic ${topic}`;
                        console.log(value);
                    })
                });
            }
            catch (error) {
            }
        });
    }
}
exports.default = KafkaController;
