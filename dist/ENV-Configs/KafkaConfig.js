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
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaConfig = exports.KafkaConfig = void 0;
const kafkajs_1 = require("kafkajs");
const ENV_configs_1 = require("./ENV.configs");
class KafkaConfig {
    constructor() {
        this.producer = null;
        this.consumer = null;
        this.DEFAULT_TIMEOUT = 35000; // 35 seconds timeout
        this.kafka = new kafkajs_1.Kafka({
            clientId: ENV_configs_1.configs.CLIENT_ID,
            brokers: [ENV_configs_1.configs.BROKER_1],
            retry: {
                maxRetryTime: 60000, // 60 seconds
            },
            connectionTimeout: 10000, // 10 seconds
            requestTimeout: 25000, // 25 seconds
        });
    }
    static getInstance() {
        if (!KafkaConfig.instance) {
            KafkaConfig.instance = new KafkaConfig();
        }
        return KafkaConfig.instance;
    }
    getProducer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.producer) {
                this.producer = this.kafka.producer({
                    maxInFlightRequests: 1,
                    idempotent: true,
                });
                yield this.producer.connect();
            }
            return this.producer;
        });
    }
    delay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    // async getConsumer(groupId: string): Promise<Consumer> {
    //   if (!this.consumer) {
    //     this.consumer = this.kafka.consumer({ groupId });
    //     await this.consumer.connect();
    //   }
    //   return this.consumer;
    // }
    // async sendMessage(
    //   topic: string,
    //   message: any,
    //   attempt: number = 1
    // ): Promise<void> {
    //   try {
    //     const producer = await this.getProducer();
    //     const kafkaMessage = {
    //       key: message.transactionId,
    //       value: JSON.stringify(message),
    //       headers: {
    //         'idempotency-key': message.transactionId,
    //         'attempt': attempt.toString(),
    //         'timestamp': Date.now().toString(),
    //       }
    //     };
    //     await producer.send({
    //       topic,
    //       messages: [kafkaMessage],
    //       acks: -1, // Wait for all replicas to acknowledge
    //     });
    //     console.log(`Message sent successfully to topic ${topic}:`, {
    //       transactionId: message.transactionId,
    //       attempt
    //     });
    //   } catch (error) {
    //     console.error(`Error sending message to ${topic}:`, error);
    //     if (attempt < 3) {
    //       console.log(`Retrying message send (attempt ${attempt + 1}/${3})`);
    //       await this.delay(3000 * attempt); // Exponential backoff
    //       return this.sendMessage(topic, message, attempt + 1);
    //     }
    //     throw new Error(
    //       `Failed to send message after ${3} attempts: ${error}`
    //     );
    //   }
    // }
    sendMessage(topic, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const producer = yield this.getProducer();
                yield producer.send({
                    topic,
                    messages: [{ value: JSON.stringify(message) }]
                });
                console.log(`Message sent to topic ${topic}:`, message);
            }
            catch (error) {
                console.error(`Error sending message to ${topic}:`, error);
                throw error;
            }
        });
    }
    handlePaymentTransaction(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Send payment success message
                yield this.sendMessage('payment.success', event);
                console.log('///////////////////Payment success event sent:', event);
                // Wait for saga completion message
                const sagaResponse = yield this.consumeMessages('payment.saga.completed', event.transactionId);
                console.log('Saga completion received:', sagaResponse);
                return sagaResponse;
            }
            catch (error) {
                console.error('Error in payment transaction:', error);
                throw error;
            }
        });
    }
    getConsumer(groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.consumer) {
                this.consumer = this.kafka.consumer({
                    groupId,
                    sessionTimeout: 30000,
                    heartbeatInterval: 3000,
                    readUncommitted: false // Instead of autoOffsetReset
                });
                yield this.consumer.connect();
            }
            return this.consumer;
        });
    }
    consumeMessages(topicName, transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const consumer = yield this.getConsumer('payment-saga-participant-group');
            try {
                const message = yield this.waitForMessage(consumer, topicName, transactionId);
                console.log('Final message received:', message);
                return message;
            }
            finally {
                // Ensure consumer is always stopped after message is received or timeout occurs
                yield consumer.stop();
            }
        });
    }
    waitForMessage(consumer, topicName, transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let timeoutId;
                let isResolved = false;
                const cleanup = () => __awaiter(this, void 0, void 0, function* () {
                    clearTimeout(timeoutId);
                    if (!isResolved) {
                        try {
                            console.log('stoping consumer');
                            yield consumer.stop();
                        }
                        catch (error) {
                            console.error('Error stopping consumer:', error);
                        }
                    }
                });
                // Set up timeout
                timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield cleanup();
                    reject(new Error(`Timeout waiting for message with transactionId: ${transactionId}`));
                }), this.DEFAULT_TIMEOUT);
                const messageHandler = (_a) => __awaiter(this, [_a], void 0, function* ({ topic, partition, message }) {
                    var _b;
                    try {
                        const value = JSON.parse(((_b = message.value) === null || _b === void 0 ? void 0 : _b.toString()) || '{}');
                        console.log('Received message:', value);
                        if (value.transactionId === transactionId) {
                            console.log('Transaction ID matched:', transactionId);
                            isResolved = true;
                            yield cleanup();
                            resolve(value);
                        }
                    }
                    catch (error) {
                        console.error('Error processing message:', error);
                        yield cleanup();
                        reject(error);
                    }
                });
                // Subscribe to topic
                consumer.subscribe({
                    topic: topicName,
                    fromBeginning: true
                });
                // Start consuming messages
                consumer.run({
                    eachMessage: messageHandler
                }).catch((error) => __awaiter(this, void 0, void 0, function* () {
                    console.error('Consumer run error:', error);
                    yield cleanup();
                    reject(error);
                }));
            });
        });
    }
}
exports.KafkaConfig = KafkaConfig;
exports.kafkaConfig = KafkaConfig.getInstance();
