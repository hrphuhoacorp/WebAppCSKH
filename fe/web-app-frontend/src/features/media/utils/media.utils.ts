export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
};

export const getImageBlob = async (url: string): Promise<Blob> => {
    const res = await fetch(url, { mode: 'cors' });
    return res.blob();
};

export const getImageBlobFromCanvas = async (url: string): Promise<Blob> => {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = objectUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Canvas error'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(b => {
                URL.revokeObjectURL(objectUrl);
                b ? resolve(b) : reject(new Error('toBlob failed'));
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Load error'));
        };
    });
};
export const getFullImageUrl = (relativeUrl: string): string => {
    if (!relativeUrl) return '';

    // Nếu đã là absolute URL
    if (relativeUrl.startsWith('http')) return relativeUrl;

    // Sử dụng NEXT_PUBLIC_DOTNET_API_ORIGIN từ .env
    const baseUrl = process.env.NEXT_PUBLIC_DOTNET_API_ORIGIN ;

    // Đảm bảo relativeUrl bắt đầu bằng /
    const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;

    return `${baseUrl}${path}`;
};

export const getAllSubFolderIds = (folderId: number, folders: any[]): number[] => {
    const ids = [folderId];
    folders.filter((f: any) => f.parentId === folderId).forEach((sub: any) => ids.push(...getAllSubFolderIds(sub.id, folders)));
    return ids;
};

export const flattenFolders = (folders: any[]): any[] => {
    const result: any[] = [];
    const flatten = (items: any[]) => {
        items.forEach(item => {
            result.push(item);
            if (item.children?.length) flatten(item.children);
        });
    };
    flatten(folders);
    return result;
};