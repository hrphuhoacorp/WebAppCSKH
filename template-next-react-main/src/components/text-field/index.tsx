import React, { forwardRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

// Dùng forwardRef để nhận `ref` từ react-hook-form và truyền xuống dưới
const CustomTextField = forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => {
    const { InputLabelProps, variant = 'outlined', size = 'small', ...rest } = props;

    return (
        <TextField
            inputRef={ref} 
            size={size}
            variant={variant}
            InputLabelProps={{ ...InputLabelProps }}
            {...rest}
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.3s ease',
                    '& fieldset': {
                        borderColor: '#e5e7eb'
                    },
                    '&:hover fieldset': {
                        borderColor: '#6366f1'
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#4f46e5',
                        borderWidth: '2px',
                        boxShadow: '0 0 0 2px rgba(79,70,229,0.2)'
                    }
                },
                '& .MuiInputLabel-root': {
                    fontWeight: 500
                }
            }}
        />
    );
});

CustomTextField.displayName = 'CustomTextField';

export default CustomTextField;