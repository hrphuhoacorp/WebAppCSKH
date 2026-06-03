

type CustomerSchema = {
    id: number;
    customerCode: string;
    name: string;
    phone: string;
    totalOrders: number;
    totalRevenue: number;
    lastOrderAt: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy: number;
    createdName:string;
    dayOfBirth: string | null;
    orders: OrderSchema[];
}