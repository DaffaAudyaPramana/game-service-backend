const generateOrderId = () => {
  return "ORD-" + Date.now();
};

export default generateOrderId;