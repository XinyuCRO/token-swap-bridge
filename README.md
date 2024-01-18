## Token Swap Bridge

POC for token swap bridge, it can achieve the following:

- Bridge ERC20 tokens without having to pay the base token
    - bridge 300 USDC and pay using USDC
    - bridge 300 USDC and receive equivalent amount of base token

## Documentation

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
