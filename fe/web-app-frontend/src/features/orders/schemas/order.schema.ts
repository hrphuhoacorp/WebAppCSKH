type OrderItemSchema = {
    id: number;
    category: string;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity:number;
    serviceName: string;
    unit: string;
};

type OrderSchema = {
    id: number;
    orderCode: string;
    purchaseDate: string;
    source: string;
    channel: string;
    revenue: number;
    grossProfit: number;
    shippingFee: number;
    taxAmount: number;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    statusName: string;
    branchName: string;
    items: OrderItemSchema[];
};