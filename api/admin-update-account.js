module.exports = async function handler(req, res) {
  return res.status(200).json({ ok: true, method: req.method, hasEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT });
};
