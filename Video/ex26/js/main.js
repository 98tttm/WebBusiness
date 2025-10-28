function thuchienpheptoan(a,b,pt)
{
    kq=""
    switch(pt)
    {
        case "+":
            kq=(a+b)
            break
        case "-":
            kq= (a-b)
            break
        case "*":
            kq= (a*b)
            break
        case "/":
            kq=(a/b)
            break
        default:
            kq="Lỗi phép toán"
            break
    }
    return kq
}