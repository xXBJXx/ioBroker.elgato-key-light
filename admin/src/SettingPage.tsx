import React from 'react';
import { Logo } from 'iobroker-react';
import { Stack } from '@mui/material';

interface SettingPageProps {
	onChange: (key: keyof ioBroker.AdapterConfig, value: any) => void;
	settings: ioBroker.AdapterConfig;
}

export const SettingPage: React.FC<SettingPageProps> = ({ onChange, settings }): JSX.Element => {
	// const { alive } = useAdapter();

	return (
		<React.Fragment>
			<Stack spacing={2}>
				<Logo
					classes={{
						logo: 'logo',
					}}
				/>
			</Stack>
		</React.Fragment>
	);
};
