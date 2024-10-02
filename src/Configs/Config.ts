import dotenv from 'dotenv';

dotenv.config();


const config={
    port:parseInt(process.env.PORT as string)||5007,
}


export default config