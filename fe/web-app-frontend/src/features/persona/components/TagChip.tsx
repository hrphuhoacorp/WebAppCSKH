'use client';

import { Chip, Tooltip, alpha } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { PersonaTagAssignmentDto } from '../api/persona.api';

export default function TagChip({ assignment, onRemove }: {
    assignment: PersonaTagAssignmentDto;
    onRemove?: () => void;
}) {
    const isAuto = assignment.source === 'auto';
    const color = assignment.tagColor || '#086839';

    return (
        <Tooltip
            title={isAuto ? 'Tự động gắn theo luật phân loại' : `Gắn tay${assignment.assignedByName ? ` bởi ${assignment.assignedByName}` : ''}`}
            arrow
        >
            <Chip
                size="small"
                icon={isAuto ? <AutoAwesomeRoundedIcon sx={{ fontSize: 14 }} /> : <PersonRoundedIcon sx={{ fontSize: 14 }} />}
                label={assignment.tagName}
                onDelete={!isAuto && onRemove ? onRemove : undefined}
                deleteIcon={<CloseRoundedIcon sx={{ fontSize: 14 }} />}
                sx={{
                    bgcolor: alpha(color, 0.1),
                    color,
                    border: `1px solid ${alpha(color, 0.25)}`,
                    fontWeight: 700,
                    fontSize: 12,
                    height: 26,
                    '& .MuiChip-icon': { color },
                    '& .MuiChip-deleteIcon': { color, '&:hover': { color } },
                }}
            />
        </Tooltip>
    );
}
