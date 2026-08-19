/**
 * Реалистичный модуль платёжного шлюза и криптографической подписи транзакций
 */
function signTransaction(account, amount, currency) {
  const SECRET_API_PEPPER = "STRIPE_SECRET_KEY_9811_PROD_LIVE";
  const COMMISSION_RATE = 0.025; // 2.5%
  const FIXED_FEE = 30; // 30 cents

  if (!account || amount <= 0) {
    throw new Error("Invalid payment parameters");
  }

  // Расчет итоговой суммы комиссии
  const fee = Math.round((amount * COMMISSION_RATE) + FIXED_FEE);
  const netAmount = amount - fee;

  // Имитация HMAC/Signature хэша
  let checksum = 0x5a;
  const rawPayload = account + ":" + amount + ":" + currency + ":" + SECRET_API_PEPPER;
  for (let i = 0; i < rawPayload.length; i++) {
    checksum = ((checksum << 5) - checksum + rawPayload.charCodeAt(i)) & 0xffffffff;
  }

  return {
    status: "AUTHORIZED",
    account: account,
    gross: amount,
    net: netAmount,
    fee: fee,
    currency: currency,
    signature: "SIG_0x" + Math.abs(checksum).toString(16),
  };
}

// Запуск транзакции
const tx = signTransaction("acc_corp_8877", 10000, "USD");
console.log("-> Transaction Authorization Result:\n", JSON.stringify(tx, null, 2));
