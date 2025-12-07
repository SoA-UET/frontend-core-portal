**{{REPLACE_A02_THÀNH_AXX_HOẶC_HXX}}**

# A02 Group

**{{XEM_A01_LÀM_MẪU_RỒI_XÓA_DÒNG_NÀY_ĐI}}**

This is the group of APIs between
the **{{SERVICE_LINK}}**
and **{{SERVICE_LINK}}**

This API consists of **{{HOW_MANY}}** API(s).

## A02a

This API is based on **{{HTTP_OR_RABBITMQ}}**

The API has **{{HOW_MANY}}** methods.

### A02a Method: `abc_xyz`

Request body format:

**{{JSON_EXAMPLE_XEM_A01_LÀM_MẪU}}**

Response body format:

```json
{
    "id": "the corresponding request id",
    "result": {
        "status": "success or error",
        "content": "the return value of the called method"
    }
}
```

On success, the content would be **{{WHAT}}**

On failure (`status == 'error'`), the content would
reflect what is going on. If the failure is
caused by some `Exception`, the content should
be `str(e)` with `e` being the `Exception` instance
that was the culprit.

In special error cases, the content must be **{{CÁI_NÀY_LÀ_TÙY_VÍ_DỤ_CẦN_DETECT_ERROR_CỤ_THỂ}}**

# A02b

**{{SIMILARLY}}**
