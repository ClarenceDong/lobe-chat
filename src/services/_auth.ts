import { JWTPayload, LOBE_CHAT_AUTH_HEADER } from '@/const/auth';
import { ModelProvider } from '@/libs/agent-runtime';
import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';
import { useUserStore } from '@/store/user';
import { keyVaultsConfigSelectors, userProfileSelectors } from '@/store/user/selectors';
import { GlobalLLMProviderKey } from '@/types/user/settings';
import { createJWT } from '@/utils/jwt';

export const getProviderAuthPayload = (provider: string) => {
  switch (provider) {
    case ModelProvider.Bedrock: {
      const { accessKeyId, region, secretAccessKey, sessionToken } =
        keyVaultsConfigSelectors.bedrockConfig(useUserStore.getState());

      const awsSecretAccessKey = secretAccessKey;
      const awsAccessKeyId = accessKeyId;

      const apiKey = (awsSecretAccessKey || '') + (awsAccessKeyId || '');

      return {
        apiKey,
        awsAccessKeyId,
        awsRegion: region,
        awsSecretAccessKey,
        awsSessionToken: sessionToken,
      };
    }

    case ModelProvider.Wenxin: {
      const { secretKey, accessKey } = keyVaultsConfigSelectors.wenxinConfig(
        useUserStore.getState(),
      );

      const apiKey = (accessKey || '') + (secretKey || '');

      return {
        apiKey,
        wenxinAccessKey: accessKey,
        wenxinSecretKey: secretKey,
      };
    }

    case ModelProvider.Azure: {
      const azure = keyVaultsConfigSelectors.azureConfig(useUserStore.getState());

      return {
        apiKey: azure.apiKey,
        azureApiVersion: azure.apiVersion,
        baseURL: azure.endpoint,
      };
    }

    case ModelProvider.Ollama: {
      const config = keyVaultsConfigSelectors.ollamaConfig(useUserStore.getState());

      return { baseURL: config?.baseURL };
    }

    case ModelProvider.Cloudflare: {
      const config = keyVaultsConfigSelectors.cloudflareConfig(useUserStore.getState());

      return {
        apiKey: config?.apiKey,
        cloudflareBaseURLOrAccountID: config?.baseURLOrAccountID,
      };
    }

    default: {
      const config = keyVaultsConfigSelectors.getVaultByProvider(provider as GlobalLLMProviderKey)(
        useUserStore.getState(),
      );

      return { apiKey: config?.apiKey, baseURL: config?.baseURL };
    }
  }
};

const createAuthTokenWithPayload = async (payload = {}) => {
  const accessCode = keyVaultsConfigSelectors.password(useUserStore.getState());
  const userId = userProfileSelectors.userId(useUserStore.getState());

  return createJWT<JWTPayload>({ accessCode, userId, ...payload });
};

interface AuthParams {
  // eslint-disable-next-line no-undef
  headers?: HeadersInit;
  payload?: Record<string, any>;
  provider?: string;
}

// eslint-disable-next-line no-undef
export const createHeaderWithAuth = async (params?: AuthParams): Promise<HeadersInit> => {
  let payload = params?.payload || {};

  if (params?.provider) {
    const keyVaults = aiProviderSelectors.providerKeyVaults(params?.provider)(
      useAiInfraStore.getState(),
    );
    payload = { ...payload, ...getProviderAuthPayload(params?.provider), ...keyVaults };
  }

  const token = await createAuthTokenWithPayload(payload);

  // eslint-disable-next-line no-undef
  return { ...params?.headers, [LOBE_CHAT_AUTH_HEADER]: token };
};
