# Auto Detection

AAX Audio Converter can automatically detect and use your Audible activation code, making the conversion process seamless and user-friendly.

## Security Considerations

The auto-detection feature:

- Only stores activation bytes locally
- Never stores your Audible credentials
- Uses secure HTTPS connections
- Requires explicit user consent for account access

Your Audible credentials are:

- Only used during the initial setup
- Not stored anywhere in the application
- Protected by Audible's secure authentication

## Auto Detection Features

The AAX converter includes several auto-detection features to simplify the conversion process:

- **Activation Code Detection**: Automatically detect and use the Audible activation code for conversion.
- **Format Detection**: Identify the best output format based on input file properties.
- **Chapter Detection**: Automatically detect and preserve chapter information for better navigation.
- **Bitrate Detection**: Suggest optimal bitrate settings based on input file quality.

## How It Works

The auto-detection feature:

1. Checks for the `audible` CLI binary in your PATH or project root
2. Uses the Audible CLI to retrieve your activation bytes
3. Automatically applies the activation code during conversion
4. Saves the activation code for future use

## Setup

To use auto-detection, you need to:

1. Install the Audible CLI binary
2. Run the setup command:

```bash
aax setup-audible
```

This will:

- Check for the audible binary
- Make it executable
- Run the quickstart wizard
- Retrieve your activation bytes
- Save them for future use

## Usage

Once set up, you can convert audiobooks without specifying an activation code:

```bash
# The activation code will be automatically detected and used
aax convert audiobook.aax
```

## Manual Override

If needed, you can manually specify an activation code:

```bash
# Use a specific activation code
aax convert audiobook.aax -c YOUR_ACTIVATION_CODE
```

## Troubleshooting

If auto-detection fails:

1. Ensure the `audible` binary is installed and in your PATH
2. Run `aax setup-audible` to reconfigure
3. Check the verbose output for errors:

  ```bash
  aax convert audiobook.aax -v
  ```

::: tip
The auto-detection feature makes it much easier to convert your audiobooks, as you don't need to manually find and enter activation codes.
:::

::: warning
Make sure to keep your Audible CLI credentials secure, as they are used to access your Audible account.
:::
