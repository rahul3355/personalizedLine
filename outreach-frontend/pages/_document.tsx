// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Google Identity Services script */}
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        ></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
