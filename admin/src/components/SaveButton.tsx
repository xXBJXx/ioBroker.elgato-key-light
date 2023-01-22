import React from 'react';
import { Box, Button, useTheme } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

interface SaveButtonProps {
	onClick: () => void;
	changed: boolean;
	lable: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ onClick, changed, lable }): JSX.Element => {
	const theme = useTheme();
	return (
		<>
			<Box
				component="div"
				sx={{
					display: 'flex',
					flexFlow: 'row nowrap',
					justifyItems: 'space-between',
					justifyContent: 'center',
					gap: theme.spacing(1),
					padding: theme.spacing(1, 4),
				}}
			>
				<Button
					aria-label={lable}
					variant="contained"
					size="medium"
					sx={{
						fontWeight: 'bold',
					}}
					startIcon={<SaveIcon />}
					onClick={() => onClick()}
					disabled={!changed}
				>
					{lable}
				</Button>
			</Box>
		</>
	);
};
