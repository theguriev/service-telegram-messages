import jwt, { VerifyOptions } from 'jsonwebtoken'

const verify = (token: string, secret:string, options?: VerifyOptions) => new Promise<jwt.JwtPayload>((resolve, reject) => {
  jwt.verify(token, secret, options, (err, decoded) => {
    if (err) {
      reject(createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        message: `Invalid access token: ${err.message}`,
      }))
    }
    resolve(decoded as jwt.JwtPayload)
  })
})

export default verify
