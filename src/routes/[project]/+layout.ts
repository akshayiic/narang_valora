export async function load({ params }) {
	const { project } = params;

	// Parse project ID (format: "runwal-raaya-test")
	const parts = project.split('-');
	const orgRaw = parts[0];
	const prjRaw = parts[1];
	const envRaw = parts[2]; // Can be 'test', 'staging', or undefined

	const org = orgRaw.toLowerCase();
	const prj = prjRaw.toLowerCase();
	const env = envRaw?.toLowerCase() || 'production';

	return {
		org,
		prj,
		env
	};
}
