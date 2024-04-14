import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//for json data
app.use(express.json({
    limit: "16kb"
}))

//for endcoding the url 
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

//for storing the images, pdf in the server in the public folder
app.use(express.static("public"))

//for setting the cookie  in the user browser
app.use(cookieParser())

export default {app}