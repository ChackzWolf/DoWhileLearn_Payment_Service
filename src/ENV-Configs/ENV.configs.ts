import dotenv from 'dotenv';

dotenv.config();


export const configs = {
    // LISTENER PORT
    PORT : process.env.PORT || 3007,

    // GRPC PORT CONFIGS
    PAYMENT_GRPC_PORT : process.env.PAYMENT_GRPC_PORT || 5007,

    // PAYMENT GATEWAY CONFIGS
    STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY || '',

    // LOGGER CONFIGS
    LOG_RETENTION_DAYS : process.env.LOG_RETENTION_DAYS || '7d'
}

