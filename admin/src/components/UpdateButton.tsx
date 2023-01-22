import React from 'react';
import { Box, Button, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

interface UpdateButtonProps {
	onClick: () => void;
	lable: string;
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({ onClick, lable }): JSX.Element => {
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
					startIcon={<CheckIcon />}
					onClick={() => onClick()}
				>
					{lable}
				</Button>
			</Box>
		</>
	);
};
