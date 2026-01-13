function giaiPtb2(a,b,c)
{
    delta = b*b - 4*a*c
    if (delta < 0)
    {
    return "Phương trình vô nghiệm"
    }
    else if (delta==0)
    {
    x = -b/2*a;
    return "x="+x
    }
    else
    {
    x1 = (-b + (Math.sqrt(delta))/2*a)
    x2 = (-b - (Math.sqrt(delta))/2*a)
    return "x1=" +x1+ "; x2="+x2
    }
}